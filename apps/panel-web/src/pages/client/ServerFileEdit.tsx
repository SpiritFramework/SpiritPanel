import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, FilePenLine, RotateCcw, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { countLines, fileBaseName } from '../../lib/file-manager';
import { parentPath } from '../../lib/paths';
import { getLanguageFromFilename, highlightCode } from '../../lib/syntax-highlighter';
import { useServer } from '../../context/ServerContext';
import { useServerManageBase } from '../../hooks/useServerRouteId';
import { getServerAccess } from '../../lib/server-access';
import { Button } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import {
  ServerErrorBanner,
  ServerPage,
  ServerPageHeader,
  ServerToolbarButton,
} from '../../components/server/ServerPage';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ServerFileEditPage() {
  const { serverId: id, base } = useServerManageBase();
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('file') ?? '';
  const returnDir = searchParams.get('dir') ?? parentPath(filePath);

  const { server } = useServer();
  const access = getServerAccess(server);

  const [fileContent, setFileContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lineCount, setLineCount] = useState(1);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dirty = fileContent !== savedContent;

  const fileName = fileBaseName(filePath);
  const language = getLanguageFromFilename(fileName);
  // Skip highlighting for very large files to prevent freezing
  const shouldHighlight = fileContent.length < 500000; // 500KB limit
  const highlightedTokens = useMemo(
    () =>
      shouldHighlight
        ? highlightCode(fileContent, language)
        : [{ type: 'text' as const, content: fileContent }],
    [fileContent, language, shouldHighlight],
  );

  const filesUrl = `${base}/files?dir=${encodeURIComponent(returnDir)}`;

  const loadFile = useCallback(async () => {
    if (!id || !filePath) return;
    setLoading(true);
    setFileError(null);
    try {
      const content = await api.client.fileContents(id, filePath);
      const text = typeof content === 'string' ? content : String(content);
      setFileContent(text);
      setSavedContent(text);
      updateLineCount(text);
    } catch (e) {
      setFileContent('');
      setSavedContent('');
      setFileError(e instanceof Error ? e.message : 'Failed to load file');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => editorRef.current?.focus());
    }
  }, [id, filePath]);

  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const updateLineCount = (text: string) => {
    setLineCount(Math.max(1, text.split('\n').length));
  };

  const saveFile = useCallback(async () => {
    if (!id || !filePath || !access.canWriteFiles) return;
    setSaveState('saving');
    setFileError(null);
    try {
      await api.client.writeFile(id, filePath, fileContent);
      setSavedContent(fileContent);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 2000);
    } catch (e) {
      setSaveState('error');
      setFileError(e instanceof Error ? e.message : 'Failed to save file');
    }
  }, [id, filePath, access.canWriteFiles, fileContent]);

  useEffect(() => {
    if (!access.canWriteFiles) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void saveFile();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [access.canWriteFiles, saveFile]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setFileContent(text);
    updateLineCount(text);
    setSaveState('idle');
    syncScroll();
  };

  const TAB = '\t';

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || !access.canWriteFiles) return;
    e.preventDefault();

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = fileContent;

    if (e.shiftKey) {
      // Dedent: remove one leading tab or up to 2 spaces on each selected line.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end);
      const blockEnd = lineEnd === -1 ? value.length : lineEnd;
      const block = value.slice(lineStart, blockEnd);
      const dedented = block
        .split('\n')
        .map((line) => (line.startsWith(TAB) ? line.slice(1) : line.replace(/^ {1,2}/, '')))
        .join('\n');
      if (dedented === block) return;
      const next = value.slice(0, lineStart) + dedented + value.slice(blockEnd);
      const removed = block.length - dedented.length;
      setFileContent(next);
      updateLineCount(next);
      setSaveState('idle');
      requestAnimationFrame(() => {
        el.selectionStart = Math.max(lineStart, start - Math.min(removed, start - lineStart));
        el.selectionEnd = Math.max(el.selectionStart, end - removed);
        syncScroll();
      });
      return;
    }

    // Indent selection (multi-line) or insert a tab at the caret.
    if (start !== end && value.slice(start, end).includes('\n')) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end);
      const blockEnd = lineEnd === -1 ? value.length : lineEnd;
      const block = value.slice(lineStart, blockEnd);
      const indented = block
        .split('\n')
        .map((line) => TAB + line)
        .join('\n');
      const next = value.slice(0, lineStart) + indented + value.slice(blockEnd);
      const added = indented.length - block.length;
      setFileContent(next);
      updateLineCount(next);
      setSaveState('idle');
      requestAnimationFrame(() => {
        el.selectionStart = start + 1;
        el.selectionEnd = end + added;
        syncScroll();
      });
      return;
    }

    const next = value.slice(0, start) + TAB + value.slice(end);
    setFileContent(next);
    updateLineCount(next);
    setSaveState('idle');
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 1;
      syncScroll();
    });
  };

  const syncScroll = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editor.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = editor.scrollTop;
      highlightRef.current.scrollLeft = editor.scrollLeft;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const downloadFile = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
    element.setAttribute('download', fileBaseName(filePath));
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!filePath) {
    return (
      <ServerPage>
        <ServerErrorBanner message="No file specified." />
        <Link to={filesUrl} className="text-sm accent-text hover:underline">
          ← Back to files
        </Link>
      </ServerPage>
    );
  }

  const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';

  return (
    <ServerPage fullHeight className="min-h-0">
      <ServerPageHeader
        title={fileName}
        description={`${filePath} • ${countLines(fileContent)} lines • ${fileContent.length} characters`}
        actions={
          <>
            <Link
              to={filesUrl}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              onClick={(e) => {
                if (dirty && !confirm('You have unsaved changes. Discard them?')) e.preventDefault();
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy</span>
            </button>
            <button
              onClick={downloadFile}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              title="Download file"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            {access.canWriteFiles && (
              <>
                <ServerToolbarButton
                  icon={RotateCcw}
                  label="Revert"
                  onClick={() => {
                    setFileContent(savedContent);
                    updateLineCount(savedContent);
                  }}
                  disabled={!dirty || loading}
                />
                <Button onClick={saveFile} disabled={!dirty || loading || saveState === 'saving'}>
                  {saveState === 'saving' ? (
                    'Saving…'
                  ) : saveState === 'saved' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        }
      />

      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] server-panel">
        {/* Editor Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <FilePenLine className="h-4 w-4 accent-text" />
            <div className="flex items-center gap-2">
              {dirty && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Unsaved
                </span>
              )}
              {!access.canWriteFiles && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                  Read-only
                </span>
              )}
              {fileExtension && (
                <span className="rounded-md bg-[var(--accent-muted)] px-2 py-1 text-xs font-mono text-[var(--accent)]">
                  {fileExtension.toUpperCase()}
                  {language ? ` · ${language}` : ' · plain'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
            <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]">
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => setShowLineNumbers(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>Line numbers</span>
            </label>
            {access.canWriteFiles && (
              <span className="hidden sm:inline">Tab indent · Shift+Tab outdent · Ctrl+S save</span>
            )}
          </div>
        </div>

        <ServerErrorBanner message={fileError ?? ''} />

        {/* Editor */}
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0a0e14]">
          {loading ? (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Spinner className="h-6 w-6" />
                <p className="text-sm text-[var(--muted)]">Loading file…</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px]">
              {/* Line Numbers — same font metrics as editor so rows stay aligned */}
              {showLineNumbers && (
                <div
                  ref={lineNumbersRef}
                  className="file-editor-gutter select-none overflow-hidden border-r border-[#1a2332] bg-[#050810] text-right text-[#6b7089] flex-shrink-0"
                  aria-hidden
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i + 1} className="file-editor-gutter__line">
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}

              {/* Shared box: highlight overlay + textarea must share identical metrics */}
              <div className="relative min-h-0 min-w-0 flex-1">
                <pre
                  ref={highlightRef}
                  className="file-editor-layer file-editor-highlight pointer-events-none absolute inset-0 overflow-hidden"
                  aria-hidden
                >
                  {highlightedTokens.map((token, i) => (
                    <span key={i} className={`syntax-${token.type}`}>
                      {token.content}
                    </span>
                  ))}
                  {/* Trailing newline keeps last empty line height in sync with textarea */}
                  {fileContent.endsWith('\n') ? '\n' : null}
                </pre>

                <textarea
                  ref={editorRef}
                  value={fileContent}
                  onChange={handleTextareaChange}
                  onKeyDown={handleEditorKeyDown}
                  onScroll={syncScroll}
                  readOnly={!access.canWriteFiles}
                  spellCheck={false}
                  wrap="off"
                  className="file-editor-layer file-editor-input h-full min-h-[320px] w-full resize-none overflow-auto outline-none focus:outline-none"
                  placeholder={access.canWriteFiles ? 'Start typing…' : 'Read-only file view'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-3 text-xs text-[var(--muted)] flex items-center justify-between">
          <div>
            {lineCount} line{lineCount !== 1 ? 's' : ''} • {fileContent.length} character{fileContent.length !== 1 ? 's' : ''}
          </div>
          <div>
            {fileExtension && <span className="font-mono">{fileExtension.toUpperCase()}</span>}
          </div>
        </div>
      </div>
    </ServerPage>
  );
}

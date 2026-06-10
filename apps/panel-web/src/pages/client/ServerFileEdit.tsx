import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, FilePenLine, RotateCcw, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { countLines, fileBaseName } from '../../lib/file-manager';
import { parentPath } from '../../lib/paths';
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

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const dirty = fileContent !== savedContent;

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

  return (
    <ServerPage fullHeight className="min-h-0">
      <ServerPageHeader
        title={fileBaseName(filePath)}
        description={filePath}
        actions={
          <>
            <Link
              to={filesUrl}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
              onClick={(e) => {
                if (dirty && !confirm('You have unsaved changes. Discard them?')) e.preventDefault();
              }}
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Link>
            {access.canWriteFiles && (
              <>
                <ServerToolbarButton
                  icon={RotateCcw}
                  label="Revert"
                  onClick={() => setFileContent(savedContent)}
                  disabled={!dirty || loading}
                />
                <Button onClick={saveFile} disabled={!dirty || loading || saveState === 'saving'}>
                  {saveState === 'saving' ? (
                    'Saving…'
                  ) : saveState === 'saved' ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] server-panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-3 py-2 text-[11px]">
          <FilePenLine className="h-3.5 w-3.5 accent-text" />
          {dirty && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              Unsaved
            </span>
          )}
          {!access.canWriteFiles && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
              Read only
            </span>
          )}
          <span className="ml-auto text-[10px] text-[var(--muted)]">
            {countLines(fileContent)} lines · {fileContent.length} chars
            {access.canWriteFiles && <span className="hidden sm:inline"> · Ctrl+S to save</span>}
          </span>
        </div>

        <ServerErrorBanner message={fileError ?? ''} />

        <div className="relative min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <textarea
              ref={editorRef}
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setSaveState('idle');
              }}
              readOnly={!access.canWriteFiles}
              spellCheck={false}
              className="file-editor-input h-full min-h-[320px] w-full resize-none bg-[#0a0e14] p-4 font-mono text-[11px] leading-relaxed text-green-400/90 outline-none"
              placeholder={access.canWriteFiles ? 'Start typing…' : 'Read-only file view'}
            />
          )}
        </div>
      </div>
    </ServerPage>
  );
}

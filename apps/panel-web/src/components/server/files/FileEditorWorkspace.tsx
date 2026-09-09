import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileCode2,
  Hash,
  RotateCcw,
  Save,
  Search,
  WrapText,
  X,
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useServer } from '../../../context/ServerContext';
import { useServerManageBase } from '../../../hooks/useServerRouteId';
import { getServerAccess } from '../../../lib/server-access';
import { fileBaseName, formatBytes } from '../../../lib/file-manager';
import { pathSegments, parentPath } from '../../../lib/paths';
import { useFileEditor } from '../../../hooks/useFileEditor';
import { ConfirmModal } from '../../ConfirmModal';
import { ServerEggIcon } from '../../ServerEggIcon';
import { StatusPill, Spinner } from '../../ui';

export function FileEditorWorkspace({ filePath }: { filePath: string }) {
  const navigate = useNavigate();
  const { serverId: id, base } = useServerManageBase();
  const { server } = useServer();
  const access = getServerAccess(server);
  const toast = useToast();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const editor = useFileEditor(id, filePath, access.canWriteFiles);
  const filesUrl = `${base}/files?dir=${encodeURIComponent(editor.returnDir)}`;
  const dirPath = parentPath(filePath);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editor.fileContent);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const downloadFile = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(editor.fileContent));
    element.setAttribute('download', fileBaseName(filePath));
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const saveLabel =
    editor.saveState === 'saving'
      ? 'Saving…'
      : editor.saveState === 'saved'
        ? 'Saved'
        : 'Save';

  return (
    <div className="ds-srv-fe-shell flex min-h-0 flex-1 flex-col">
      <header className="ds-srv-fe-header">
        <div className="ds-srv-fe-header-accent" aria-hidden />
        <div className="ds-srv-fe-header-body">
          <div className="ds-srv-fe-header-main">
            <div className="ds-srv-fe-header-identity">
              <div className="ds-srv-fe-header-icon-wrap" aria-hidden>
                <ServerEggIcon
                  eggName={server.egg?.name ?? 'Server'}
                  logoUrl={server.egg?.logoUrl}
                  className="h-5 w-5"
                  iconClassName="h-5 w-5 text-white/90"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="ds-srv-fe-header-title-row">
                  <h1 className="ds-srv-fe-header-title truncate">{editor.fileName}</h1>
                  {editor.fileExtension ? (
                    <StatusPill label={editor.fileExtension.toUpperCase()} tone="neutral" compact />
                  ) : null}
                  {editor.dirty ? <StatusPill label="Unsaved" tone="warning" compact /> : null}
                  {!access.canWriteFiles ? <StatusPill label="Read-only" tone="neutral" compact /> : null}
                  {editor.saveState === 'saved' ? <StatusPill label="Saved" tone="success" compact /> : null}
                </div>
                <p className="ds-srv-fe-header-meta truncate font-mono text-xs">{filePath}</p>
              </div>
            </div>

            <div className="ds-srv-fe-header-actions">
              <Link
                to={filesUrl}
                className="ds-srv-fe-action-btn"
                title="Back to files"
                onClick={(e) => {
                  if (!editor.dirty) return;
                  e.preventDefault();
                  setLeaveConfirmOpen(true);
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <button type="button" className="ds-srv-fe-action-btn" title="Copy" onClick={() => void copyToClipboard()}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button type="button" className="ds-srv-fe-action-btn" title="Download" onClick={downloadFile}>
                <Download className="h-3.5 w-3.5" aria-hidden />
              </button>
              {access.canWriteFiles ? (
                <>
                  <button
                    type="button"
                    className="ds-srv-fe-action-btn"
                    title="Revert changes"
                    disabled={!editor.dirty || editor.loading}
                    onClick={editor.revertFile}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ds-srv-fe-btn ds-srv-fe-btn--primary"
                    disabled={!editor.dirty || editor.loading || editor.saveState === 'saving'}
                    onClick={() => void editor.saveFile()}
                  >
                    {editor.saveState === 'saved' ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Save className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {saveLabel}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <nav className="ds-srv-fe-breadcrumb" aria-label="File path">
            <Link to={`${base}/files?dir=${encodeURIComponent('/')}`} className="ds-srv-fe-crumb">
              root
            </Link>
            {pathSegments(dirPath).map((seg) => (
              <span key={seg.path} className="ds-srv-fe-crumb-group">
                <span className="ds-srv-fe-crumb-sep">/</span>
                <Link to={`${base}/files?dir=${encodeURIComponent(seg.path)}`} className="ds-srv-fe-crumb">
                  {seg.label}
                </Link>
              </span>
            ))}
            <span className="ds-srv-fe-crumb-group">
              <span className="ds-srv-fe-crumb-sep">/</span>
              <span className="ds-srv-fe-crumb ds-srv-fe-crumb--current">{editor.fileName}</span>
            </span>
          </nav>
        </div>
      </header>

      <div className="ds-srv-fe-toolbar">
        <div className="ds-srv-fe-toolbar-group">
          <button
            type="button"
            className={`ds-srv-fe-tool-btn${editor.showLineNumbers ? ' ds-srv-fe-tool-btn--active' : ''}`}
            onClick={() => editor.setShowLineNumbers((v) => !v)}
            title="Toggle line numbers"
          >
            <Hash className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Lines</span>
          </button>
          <button
            type="button"
            className={`ds-srv-fe-tool-btn${editor.wordWrap ? ' ds-srv-fe-tool-btn--active' : ''}`}
            onClick={() => editor.setWordWrap((v) => !v)}
            title="Toggle word wrap"
          >
            <WrapText className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Wrap</span>
          </button>
          <button
            type="button"
            className={`ds-srv-fe-tool-btn${editor.showFind ? ' ds-srv-fe-tool-btn--active' : ''}`}
            onClick={() => {
              editor.setShowFind((v) => !v);
              if (!editor.showFind) requestAnimationFrame(() => editor.findInputRef.current?.focus());
            }}
            title="Find (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Find</span>
          </button>
        </div>
        <div className="ds-srv-fe-toolbar-meta">
          {editor.language ? (
            <span className="ds-srv-fe-lang">
              <FileCode2 className="h-3 w-3" aria-hidden />
              {editor.language}
            </span>
          ) : null}
          {access.canWriteFiles ? (
            <span className="ds-srv-fe-hint hidden md:inline">Tab · Shift+Tab · Ctrl+S</span>
          ) : null}
        </div>
      </div>

      {editor.showFind ? (
        <div className="ds-srv-fe-find">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
          <input
            ref={editor.findInputRef}
            type="search"
            value={editor.findQuery}
            onChange={(e) => editor.setFindQuery(e.target.value)}
            placeholder="Find in file…"
            className="ds-srv-fe-find-input"
            aria-label="Find in file"
          />
          <span className="ds-srv-fe-find-count">
            {editor.findQuery.trim() ? `${editor.findMatches} match${editor.findMatches === 1 ? '' : 'es'}` : '—'}
          </span>
          <button
            type="button"
            className="ds-srv-fe-tool-btn"
            aria-label="Close find"
            onClick={() => {
              editor.setShowFind(false);
              editor.setFindQuery('');
              editor.editorRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}

      {editor.fileError ? (
        <div className="ds-srv-fe-error" role="alert">
          {editor.fileError}
        </div>
      ) : null}

      <div className={`ds-srv-fe-editor${editor.wordWrap ? ' ds-srv-fe-editor--wrap' : ''}`}>
        {editor.loading ? (
          <div className="ds-srv-fe-loading">
            <Spinner className="h-6 w-6" />
            <p>Loading file…</p>
          </div>
        ) : (
          <div className="ds-srv-fe-editor-inner">
            {editor.showLineNumbers ? (
              <div ref={editor.lineNumbersRef} className="ds-srv-fe-gutter" aria-hidden>
                {Array.from({ length: editor.lineCount }, (_, i) => {
                  const line = i + 1;
                  const active = line === editor.cursorLine;
                  return (
                    <div key={line} className={`ds-srv-fe-gutter-line${active ? ' ds-srv-fe-gutter-line--active' : ''}`}>
                      {line}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="ds-srv-fe-canvas">
              <pre
                ref={editor.highlightRef}
                className="file-editor-layer file-editor-highlight ds-srv-fe-highlight pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden
              >
                {editor.highlightedTokens.map((token, i) => (
                  <span key={i} className={`syntax-${token.type}`}>
                    {token.content}
                  </span>
                ))}
                {editor.fileContent.endsWith('\n') ? '\n' : null}
              </pre>

              <textarea
                ref={editor.editorRef}
                value={editor.fileContent}
                onChange={editor.handleTextareaChange}
                onKeyDown={editor.handleEditorKeyDown}
                onScroll={editor.syncScroll}
                onSelect={(e) => editor.updateCursorFromSelection(e.currentTarget)}
                onKeyUp={(e) => editor.updateCursorFromSelection(e.currentTarget)}
                onClick={(e) => editor.updateCursorFromSelection(e.currentTarget)}
                readOnly={!access.canWriteFiles}
                spellCheck={false}
                wrap={editor.wordWrap ? 'soft' : 'off'}
                className="file-editor-layer file-editor-input ds-srv-fe-input h-full w-full resize-none overflow-auto outline-none"
                placeholder={access.canWriteFiles ? 'Start typing…' : 'Read-only file view'}
              />
            </div>
          </div>
        )}
      </div>

      <footer className="ds-srv-fe-status">
        <div className="ds-srv-fe-status-group">
          <span>
            Ln {editor.cursorLine}, Col {editor.cursorCol}
          </span>
          <span className="ds-srv-fe-status-sep" aria-hidden>
            ·
          </span>
          <span>
            {editor.lineCount} line{editor.lineCount !== 1 ? 's' : ''}
          </span>
          <span className="ds-srv-fe-status-sep" aria-hidden>
            ·
          </span>
          <span>{formatBytes(new TextEncoder().encode(editor.fileContent).length)}</span>
        </div>
        {!editor.shouldHighlight && editor.fileContent.length >= 500_000 ? (
          <span className="ds-srv-fe-status-hint">Syntax highlighting disabled for large files</span>
        ) : null}
      </footer>

      <ConfirmModal
        open={leaveConfirmOpen}
        title="Discard unsaved changes?"
        description="You have unsaved changes. Leave this file without saving?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="warning"
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          navigate(filesUrl);
        }}
      />
    </div>
  );
}

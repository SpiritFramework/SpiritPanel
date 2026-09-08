import { Copy, Download, FileArchive, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { joinPath } from '../../../lib/paths';
import { formatBytes, getFileIcon, isArchive, type FileEntry } from '../../../lib/file-manager';
import type { getServerAccess } from '../../../lib/server-access';
import { FileActionButton } from './FilesShared';

export function FilesGridView({
  files,
  selected,
  renaming,
  renameValue,
  onSelect,
  onNavigate,
  onOpenFile,
  onRename,
  onRenameChange,
  onCommitRename,
  onDownload,
  onExtract,
  onCopy,
  onMove,
  onDelete,
  access,
  currentDir,
}: {
  files: FileEntry[];
  selected: Set<string>;
  renaming: string | null;
  renameValue: string;
  onSelect: (name: string) => void;
  onNavigate: (path: string) => void;
  onOpenFile: (name: string) => void;
  onRename: (name: string) => void;
  onRenameChange: (value: string) => void;
  onCommitRename: () => void;
  onDownload: (name: string) => void;
  onExtract: (name: string) => void;
  onCopy: (name: string) => void;
  onMove: (name: string) => void;
  onDelete: (name: string) => void;
  access: ReturnType<typeof getServerAccess>;
  currentDir: string;
}) {
  return (
    <div className="ds-srv-fm-grid">
      {files.map((entry) => {
        const Icon = getFileIcon(entry.name, entry.directory);
        const fullPath = joinPath(currentDir, entry.name);
        const isSel = selected.has(entry.name);
        const archive = !entry.directory && isArchive(entry.name);

        return (
          <div key={entry.name} className={`ds-srv-fm-card${isSel ? ' ds-srv-fm-card--selected' : ''}`}>
            <input
              type="checkbox"
              checked={isSel}
              onChange={() => onSelect(entry.name)}
              className="ds-srv-fm-card-check"
              aria-label={`Select ${entry.name}`}
            />

            <button
              type="button"
              className="ds-srv-fm-card-preview"
              onClick={() => (entry.directory ? onNavigate(fullPath) : onOpenFile(entry.name))}
            >
              <span className={`ds-srv-fm-card-icon${entry.directory ? ' ds-srv-fm-card-icon--folder' : ''}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
            </button>

            <div className="ds-srv-fm-card-meta">
              {renaming === entry.name ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onBlur={onCommitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onCommitRename();
                    if (e.key === 'Escape') onRename('');
                  }}
                  className="ds-srv-fm-rename-input ds-srv-fm-rename-input--sm"
                />
              ) : (
                <p className="ds-srv-fm-card-name" title={entry.name}>
                  {entry.name}
                </p>
              )}
              <p className="ds-srv-fm-card-size">
                {entry.directory ? '—' : entry.size != null ? formatBytes(entry.size) : '—'}
              </p>
            </div>

            <div className="ds-srv-fm-card-actions">
              {archive && access.canCreateFiles ? (
                <FileActionButton title="Extract" onClick={() => onExtract(entry.name)} size="sm">
                  <FileArchive className="h-3.5 w-3.5" />
                </FileActionButton>
              ) : null}
              {!entry.directory && access.canReadFiles ? (
                <FileActionButton title="Download" onClick={() => onDownload(entry.name)} size="sm">
                  <Download className="h-3.5 w-3.5" />
                </FileActionButton>
              ) : null}
              {access.canCreateFiles && !entry.directory ? (
                <FileActionButton title="Duplicate" onClick={() => onCopy(entry.name)} size="sm">
                  <Copy className="h-3.5 w-3.5" />
                </FileActionButton>
              ) : null}
              {access.canWriteFiles ? (
                <FileActionButton title="Move" onClick={() => onMove(entry.name)} size="sm">
                  <FolderInput className="h-3.5 w-3.5" />
                </FileActionButton>
              ) : null}
              {access.canWriteFiles ? (
                <FileActionButton title="Rename" onClick={() => onRename(entry.name)} size="sm">
                  <Pencil className="h-3.5 w-3.5" />
                </FileActionButton>
              ) : null}
              {access.canDeleteFiles ? (
                <FileActionButton title="Delete" onClick={() => onDelete(entry.name)} danger size="sm">
                  <Trash2 className="h-3.5 w-3.5" />
                </FileActionButton>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

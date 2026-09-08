import { Copy, Download, FileArchive, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { joinPath } from '../../../lib/paths';
import { fileTypeLabel, formatBytes, getFileIcon, isArchive, type FileEntry } from '../../../lib/file-manager';
import type { getServerAccess } from '../../../lib/server-access';
import { FileActionButton } from './FilesShared';

export function FilesListView({
  files,
  selected,
  renaming,
  renameValue,
  allSelected,
  onSelectAll,
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
  allSelected: boolean;
  onSelectAll: () => void;
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
    <table className="ds-srv-fm-table">
      <thead>
        <tr>
          <th className="ds-srv-fm-table-check">
            <input type="checkbox" checked={allSelected} onChange={onSelectAll} aria-label="Select all" />
          </th>
          <th>Name</th>
          <th className="ds-srv-fm-table-size">Size</th>
          <th className="ds-srv-fm-table-type">Type</th>
          <th className="ds-srv-fm-table-actions" />
        </tr>
      </thead>
      <tbody>
        {files.map((entry) => {
          const Icon = getFileIcon(entry.name, entry.directory);
          const fullPath = joinPath(currentDir, entry.name);
          const isSel = selected.has(entry.name);
          const archive = !entry.directory && isArchive(entry.name);

          return (
            <tr key={entry.name} className={`ds-srv-fm-row${isSel ? ' ds-srv-fm-row--selected' : ''}`}>
              <td className="ds-srv-fm-table-check">
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => onSelect(entry.name)}
                  aria-label={`Select ${entry.name}`}
                />
              </td>
              <td>
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
                    className="ds-srv-fm-rename-input"
                  />
                ) : (
                  <button
                    type="button"
                    className="ds-srv-fm-name-btn"
                    onClick={() => (entry.directory ? onNavigate(fullPath) : onOpenFile(entry.name))}
                  >
                    <span className={`ds-srv-fm-entry-icon${entry.directory ? ' ds-srv-fm-entry-icon--folder' : ''}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="truncate">{entry.name}</span>
                  </button>
                )}
              </td>
              <td className="ds-srv-fm-table-size">
                {entry.directory ? '—' : entry.size != null ? formatBytes(entry.size) : '—'}
              </td>
              <td className="ds-srv-fm-table-type">{fileTypeLabel(entry.name, entry.directory)}</td>
              <td className="ds-srv-fm-table-actions">
                <div className="ds-srv-fm-row-actions">
                  {archive && access.canCreateFiles ? (
                    <FileActionButton title="Extract" onClick={() => onExtract(entry.name)}>
                      <FileArchive className="h-4 w-4" />
                    </FileActionButton>
                  ) : null}
                  {!entry.directory && access.canReadFiles ? (
                    <FileActionButton title="Download" onClick={() => onDownload(entry.name)}>
                      <Download className="h-4 w-4" />
                    </FileActionButton>
                  ) : null}
                  {access.canCreateFiles && !entry.directory ? (
                    <FileActionButton title="Duplicate" onClick={() => onCopy(entry.name)}>
                      <Copy className="h-4 w-4" />
                    </FileActionButton>
                  ) : null}
                  {access.canWriteFiles ? (
                    <FileActionButton title="Move" onClick={() => onMove(entry.name)}>
                      <FolderInput className="h-4 w-4" />
                    </FileActionButton>
                  ) : null}
                  {access.canWriteFiles ? (
                    <FileActionButton title="Rename" onClick={() => onRename(entry.name)}>
                      <Pencil className="h-4 w-4" />
                    </FileActionButton>
                  ) : null}
                  {access.canDeleteFiles ? (
                    <FileActionButton title="Delete" danger onClick={() => onDelete(entry.name)}>
                      <Trash2 className="h-4 w-4" />
                    </FileActionButton>
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

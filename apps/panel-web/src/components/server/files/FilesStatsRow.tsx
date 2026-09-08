import { File, Folder, HardDrive, Search } from 'lucide-react';

export function FilesStatsRow({
  folderCount,
  fileCount,
  selectedCount,
  hasSearch,
  canUpload,
}: {
  folderCount: number;
  fileCount: number;
  selectedCount: number;
  hasSearch: boolean;
  canUpload: boolean;
}) {
  const total = folderCount + fileCount;

  return (
    <div className="ds-srv-fm-stats">
      <div className="ds-srv-fm-stat">
        <span className="ds-srv-fm-stat-icon ds-srv-fm-stat-icon--folders" aria-hidden>
          <Folder className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-fm-stat-value">{folderCount}</p>
          <p className="ds-srv-fm-stat-label">Folders</p>
        </div>
      </div>
      <div className="ds-srv-fm-stat">
        <span className="ds-srv-fm-stat-icon ds-srv-fm-stat-icon--files" aria-hidden>
          <File className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-fm-stat-value">{fileCount}</p>
          <p className="ds-srv-fm-stat-label">Files</p>
        </div>
      </div>
      <div className="ds-srv-fm-stat">
        <span className="ds-srv-fm-stat-icon ds-srv-fm-stat-icon--total" aria-hidden>
          <HardDrive className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="ds-srv-fm-stat-value">{total}</p>
          <p className="ds-srv-fm-stat-label">
            {selectedCount > 0 ? `${selectedCount} selected` : hasSearch ? 'Filtered' : 'In view'}
          </p>
        </div>
      </div>
      {canUpload ? (
        <div className="ds-srv-fm-stat ds-srv-fm-stat--hint">
          <span className="ds-srv-fm-stat-icon ds-srv-fm-stat-icon--hint" aria-hidden>
            <Search className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="ds-srv-fm-stat-value ds-srv-fm-stat-value--hint">Drop zone</p>
            <p className="ds-srv-fm-stat-label">Drag files to upload</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

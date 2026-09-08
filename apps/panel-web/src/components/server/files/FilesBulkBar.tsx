import { FileArchive, FolderInput, Trash2 } from 'lucide-react';
import { ActionButton } from './FilesShared';
import type { getServerAccess } from '../../../lib/server-access';

export function FilesBulkBar({
  count,
  busy,
  access,
  onMove,
  onArchive,
  onDelete,
  onClear,
}: {
  count: number;
  busy: boolean;
  access: ReturnType<typeof getServerAccess>;
  onMove: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="ds-srv-fm-bulk">
      <span className="ds-srv-fm-bulk-count">
        {count} item{count !== 1 ? 's' : ''} selected
      </span>
      <div className="ds-srv-fm-bulk-actions">
        {access.canWriteFiles ? (
          <ActionButton variant="subtle" disabled={busy} onClick={onMove}>
            <FolderInput className="h-4 w-4" />
            <span className="hidden sm:inline">Move</span>
          </ActionButton>
        ) : null}
        {access.canCreateFiles ? (
          <ActionButton variant="subtle" disabled={busy} onClick={onArchive}>
            <FileArchive className="h-4 w-4" />
            <span className="hidden sm:inline">Archive</span>
          </ActionButton>
        ) : null}
        {access.canDeleteFiles ? (
          <ActionButton variant="danger" disabled={busy} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </ActionButton>
        ) : null}
        <ActionButton variant="ghost" onClick={onClear}>
          Cancel
        </ActionButton>
      </div>
    </div>
  );
}

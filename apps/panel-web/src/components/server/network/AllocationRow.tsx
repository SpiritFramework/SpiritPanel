import { Check, Copy, Network, Star, Trash2 } from 'lucide-react';
import type { ServerAllocationEntry } from '../../../lib/api';

export function AllocationRow({
  alloc,
  busy,
  canUpdate,
  canDelete,
  copied,
  onCopy,
  onSetPrimary,
  onDelete,
}: {
  alloc: ServerAllocationEntry;
  busy: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  copied: boolean;
  onCopy: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`ds-srv-net-row${alloc.isDefault ? ' ds-srv-net-row--primary' : ''}`}>
      <span className={`ds-srv-net-row-accent${alloc.isDefault ? ' ds-srv-net-row-accent--primary' : ''}`} aria-hidden />

      <span className={`ds-srv-net-row-icon${alloc.isDefault ? ' ds-srv-net-row-icon--primary' : ''}`} aria-hidden>
        {alloc.isDefault ? <Star className="h-4 w-4" /> : <Network className="h-4 w-4" />}
      </span>

      <div className="ds-srv-net-row-body">
        <div className="ds-srv-net-row-top">
          <div className="min-w-0 flex-1">
            <div className="ds-srv-net-row-badges">
              {alloc.isDefault ? (
                <span className="ds-srv-net-badge ds-srv-net-badge--primary">
                  <Star className="h-3 w-3 fill-current" aria-hidden />
                  Primary
                </span>
              ) : (
                <span className="ds-srv-net-badge">Additional</span>
              )}
              <span className="ds-srv-net-badge ds-srv-net-badge--port">:{alloc.port}</span>
            </div>
            <div className="ds-srv-net-row-address">
              <p className="ds-srv-net-row-title">{alloc.address}</p>
              <button type="button" className="ds-srv-net-row-copy" title="Copy address" onClick={onCopy}>
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              </button>
            </div>
            <p className="ds-srv-net-row-meta">
              Host {alloc.displayHost}
              <span aria-hidden>·</span>
              Bind {alloc.bindAddress}
            </p>
          </div>

          <div className="ds-srv-net-row-actions">
            {canUpdate && !alloc.isDefault ? (
              <button type="button" className="ds-srv-net-row-btn" disabled={busy} onClick={onSetPrimary}>
                {busy ? 'Updating…' : 'Make primary'}
              </button>
            ) : null}
            {canDelete && !alloc.isDefault ? (
              <button type="button" className="ds-srv-net-row-btn ds-srv-net-row-btn--danger" disabled={busy} onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                <span>Remove</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

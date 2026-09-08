import type { FormEvent } from 'react';
import { FileCode2, FolderPlus } from 'lucide-react';
import { ActionButton } from './FilesShared';

export function FilesCreateBar({
  mode,
  value,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: 'folder' | 'file';
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  const Icon = mode === 'folder' ? FolderPlus : FileCode2;
  const placeholder = mode === 'folder' ? 'New folder name…' : 'New file name (e.g., config.txt)…';

  return (
    <form onSubmit={onSubmit} className="ds-srv-fm-create">
      <Icon className="ds-srv-fm-create-icon" aria-hidden />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="ds-srv-fm-create-input"
      />
      <div className="ds-srv-fm-create-actions">
        <ActionButton type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create'}
        </ActionButton>
        <ActionButton type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </ActionButton>
      </div>
    </form>
  );
}

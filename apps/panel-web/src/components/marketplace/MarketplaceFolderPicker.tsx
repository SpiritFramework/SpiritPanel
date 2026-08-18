import { useCallback, useEffect, useState } from 'react';
import { ArrowUp, ChevronRight, Folder, Home } from 'lucide-react';
import { api } from '../../lib/api';
import { type FileEntry } from '../../lib/file-manager';
import { joinPath, parentPath, pathSegments } from '../../lib/paths';
import { ModalShell } from '../ModalShell';
import { Button } from '../Layout';
import { Spinner } from '../ui';

export function MarketplaceFolderPicker({
  serverId,
  initialDir,
  onClose,
  onSelect,
}: {
  serverId: string;
  initialDir: string;
  onClose: () => void;
  onSelect: (folderPath: string) => void;
}) {
  const [browseDir, setBrowseDir] = useState(initialDir || '/');
  const [folders, setFolders] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFolders = useCallback(
    async (dir: string) => {
      setLoading(true);
      setError('');
      try {
        const res = (await api.client.files(serverId, dir)) as { data?: FileEntry[] } | FileEntry[];
        const list = Array.isArray(res) ? res : (res.data ?? []);
        setFolders(list.filter((entry) => entry.directory));
      } catch (e) {
        setFolders([]);
        setError(e instanceof Error ? e.message : 'Failed to load folders');
      } finally {
        setLoading(false);
      }
    },
    [serverId],
  );

  useEffect(() => {
    void loadFolders(browseDir);
  }, [browseDir, loadFolders]);

  const breadcrumbs = pathSegments(browseDir);

  return (
    <ModalShell
      wide
      onClose={onClose}
      header={
        <div className="border-b border-[var(--border)] px-5 py-4 pr-12">
          <p className="text-sm font-semibold text-[var(--text)]">Choose install folder</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Pick the parent directory — the resource will be installed as a subfolder inside it.
          </p>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSelect(browseDir)}>
            Use this folder
          </Button>
        </div>
      }
    >
      <div className="px-5 py-4">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]" aria-label="Path">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            onClick={() => setBrowseDir('/')}
          >
            <Home className="h-3.5 w-3.5" aria-hidden />
            /
          </button>
          {breadcrumbs.map((crumb) => (
              <span key={crumb.path} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
                <button
                  type="button"
                  className="rounded-md px-1.5 py-0.5 hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  onClick={() => setBrowseDir(crumb.path)}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
        </nav>

        {browseDir !== '/' ? (
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
            onClick={() => setBrowseDir(parentPath(browseDir))}
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            Up to {parentPath(browseDir)}
          </button>
        ) : null}

        {error ? <p className="mb-2 text-xs text-[var(--danger-fg)]">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : folders.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">No subfolders here — you can still select this location.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {folders.map((folder) => (
              <li key={folder.name}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)]"
                  onClick={() => setBrowseDir(joinPath(browseDir, folder.name))}
                >
                  <Folder className="h-4 w-4 shrink-0 text-amber-400/90" aria-hidden />
                  <span className="truncate">{folder.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 font-mono text-xs text-[var(--muted)]">
          Selected: <span className="text-[var(--text)]">{browseDir}</span>
        </p>
      </div>
    </ModalShell>
  );
}

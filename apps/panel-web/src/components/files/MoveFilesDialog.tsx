import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, ChevronRight, Folder, Home, FolderInput } from 'lucide-react';
import { api } from '../../lib/api';
import { type FileEntry } from '../../lib/file-manager';
import { joinPath, isPathInside, parentPath, pathSegments } from '../../lib/paths';
import { ModalShell } from '../ModalShell';
import { Button } from '../Layout';
import { Spinner } from '../ui';

export interface MoveFileItem {
  name: string;
  directory: boolean;
  sourcePath: string;
}

export function MoveFilesDialog({
  serverId,
  items,
  currentDir,
  onClose,
  onMoved,
}: {
  serverId: string;
  items: MoveFileItem[];
  currentDir: string;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [browseDir, setBrowseDir] = useState(currentDir);
  const [folders, setFolders] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);

  const sourcePaths = useMemo(() => new Set(items.map((i) => i.sourcePath)), [items]);
  const blockedBrowsePaths = useMemo(
    () => items.filter((i) => i.directory).map((i) => i.sourcePath),
    [items],
  );

  const loadFolders = useCallback(async (dir: string) => {
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
  }, [serverId]);

  useEffect(() => {
    void loadFolders(browseDir);
  }, [browseDir, loadFolders]);

  const breadcrumbs = pathSegments(browseDir);

  const movePreview = useMemo(
    () =>
      items.map((item) => ({
        name: item.name,
        destination: joinPath(browseDir, item.name),
        source: item.sourcePath,
      })),
    [items, browseDir],
  );

  const validationError = useMemo(() => {
    const allSameLocation = movePreview.every((p) => p.source === p.destination);
    if (allSameLocation) return 'Items are already in this folder';

    for (const item of items) {
      const destination = joinPath(browseDir, item.name);
      if (item.directory && isPathInside(item.sourcePath, destination)) {
        return `Cannot move "${item.name}" into itself or a subfolder`;
      }
    }
    return '';
  }, [items, browseDir, movePreview]);

  async function confirmMove() {
    if (validationError) return;
    setMoving(true);
    setError('');
    try {
      const files = movePreview
        .filter((p) => p.source !== p.destination)
        .map((p) => ({ source: p.source, destination: p.destination }));
      if (files.length === 0) {
        setError('Nothing to move');
        return;
      }
      await api.client.moveFiles(serverId, files);
      onMoved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Move failed');
    } finally {
      setMoving(false);
    }
  }

  function enterFolder(name: string) {
    const fullPath = joinPath(browseDir, name);
    if (blockedBrowsePaths.some((p) => isPathInside(p, fullPath) || p === fullPath)) return;
    setBrowseDir(fullPath);
  }

  return (
    <ModalShell
      wide
      onClose={onClose}
      header={
        <div className="border-b border-[var(--border)] px-5 py-4 pr-12">
          <div className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 accent-text" />
            <h2 className="text-base font-semibold">Move {items.length} item{items.length === 1 ? '' : 's'}</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">Choose a destination folder on your server.</p>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={moving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirmMove()} disabled={moving || !!validationError || loading}>
            {moving ? <Spinner className="h-4 w-4" /> : <FolderInput className="h-4 w-4" />}
            Move here
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Moving</p>
          <ul className="max-h-24 space-y-1 overflow-y-auto text-xs">
            {items.map((item) => (
              <li key={item.sourcePath} className="font-mono truncate text-[var(--text)]">
                {item.sourcePath}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-3 py-2 text-xs">
            <button
              type="button"
              onClick={() => setBrowseDir('/')}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-medium hover:bg-[var(--surface-hover)]"
            >
              <Home className="h-3.5 w-3.5" />
              root
            </button>
            {breadcrumbs.map((seg) => (
              <span key={seg.path} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-[var(--muted)]" />
                <button
                  type="button"
                  onClick={() => setBrowseDir(seg.path)}
                  className="rounded px-1.5 py-1 font-medium hover:bg-[var(--surface-hover)]"
                >
                  {seg.label}
                </button>
              </span>
            ))}
            {browseDir !== '/' && (
              <button
                type="button"
                onClick={() => setBrowseDir(parentPath(browseDir))}
                className="ml-auto inline-flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--surface-hover)]"
              >
                <ArrowUp className="h-3 w-3" />
                Up
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : folders.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--muted)]">No subfolders</p>
            ) : (
              <ul className="space-y-1">
                {folders.map((folder) => {
                  const folderPath = joinPath(browseDir, folder.name);
                  const blocked =
                    sourcePaths.has(folderPath) ||
                    blockedBrowsePaths.some((p) => isPathInside(p, folderPath) || p === folderPath);
                  return (
                    <li key={folder.name}>
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => enterFolder(folder.name)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Folder className="h-4 w-4 shrink-0 accent-text" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--text)]">Destination:</span>{' '}
          <span className="font-mono">{browseDir === '/' ? '/ (root)' : browseDir}</span>
        </div>

        {(validationError || error) && (
          <p className="text-xs text-red-400">{validationError || error}</p>
        )}
      </div>
    </ModalShell>
  );
}

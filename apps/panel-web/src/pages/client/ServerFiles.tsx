import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  ChevronRight,
  Copy,
  Download,
  FileArchive,
  FolderPlus,
  Home,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '../../lib/api';
import { joinPath, parentPath, pathSegments } from '../../lib/paths';
import {
  fileTypeLabel,
  filterFileEntries,
  formatBytes,
  getFileIcon,
  isArchive,
  sortFileEntries,
  type FileEntry,
} from '../../lib/file-manager';
import { useServer } from '../../context/ServerContext';
import { useServerManageBase } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { Button } from '../../components/Layout';
import { EmptyState, Spinner } from '../../components/ui';
import { ServerPage, ServerPageHeader, ServerToolbarButton } from '../../components/server/ServerPage';

export function ServerFilesPage() {
  const { serverId: id, base } = useServerManageBase();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { server } = useServer();
  const access = getServerAccess(server);

  const initialDir = searchParams.get('dir') || '/';
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentDir, setCurrentDir] = useState(initialDir);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleFiles = useMemo(() => filterFileEntries(files, search), [files, search]);

  const loadFiles = useCallback(
    async (dir: string) => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      setSelected(new Set());
      try {
        const res = (await api.client.files(id, dir)) as { data?: FileEntry[] } | FileEntry[];
        const list = Array.isArray(res) ? res : (res.data ?? []);
        setFiles(sortFileEntries(list));
      } catch (e) {
        setFiles([]);
        setLoadError(e instanceof Error ? e.message : 'Failed to load directory');
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;
    void loadFiles(currentDir);
  }, [id, currentDir, loadFiles]);

  useEffect(() => {
    const dir = searchParams.get('dir') || '/';
    if (dir !== currentDir) setCurrentDir(dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function navigateTo(path: string) {
    setSearch('');
    setCurrentDir(path);
    setSearchParams(path === '/' ? {} : { dir: path }, { replace: true });
  }

  function openFile(name: string) {
    if (!id) return;
    const filePath = joinPath(currentDir, name);
    navigate(
      `${base}/files/edit?file=${encodeURIComponent(filePath)}&dir=${encodeURIComponent(currentDir)}`,
    );
  }

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === visibleFiles.length) setSelected(new Set());
    else setSelected(new Set(visibleFiles.map((f) => f.name)));
  }

  async function deleteEntries(names: string[]) {
    if (!id || names.length === 0) return;
    if (!confirm(`Delete ${names.length} item(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.client.deleteFiles(id, currentDir, names);
      toast.success(`Deleted ${names.length} item(s)`);
      await loadFiles(currentDir);
    } catch (e) {
      toast.error('Delete failed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function createFolder(e: FormEvent) {
    e.preventDefault();
    if (!id || !newFolder.trim()) return;
    setCreatingFolder(true);
    try {
      await api.client.createDirectory(id, currentDir, newFolder.trim());
      setNewFolder('');
      setShowNewFolder(false);
      await loadFiles(currentDir);
      toast.success('Folder created');
    } catch (err) {
      toast.error('Could not create folder', err instanceof Error ? err.message : undefined);
    } finally {
      setCreatingFolder(false);
    }
  }

  function startRename(name: string) {
    setRenaming(name);
    setRenameValue(name);
  }

  async function commitRename() {
    if (!id || !renaming || !renameValue.trim() || renameValue === renaming) {
      setRenaming(null);
      return;
    }
    setBusy(true);
    try {
      await api.client.renameFiles(id, currentDir, [{ from: renaming, to: renameValue.trim() }]);
      toast.success('Renamed');
      setRenaming(null);
      await loadFiles(currentDir);
    } catch (e) {
      toast.error('Rename failed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function copyEntry(name: string) {
    if (!id) return;
    setBusy(true);
    try {
      await api.client.copyFile(id, joinPath(currentDir, name));
      toast.success('Copied');
      await loadFiles(currentDir);
    } catch (e) {
      toast.error('Copy failed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function compressSelection(names: string[]) {
    if (!id || names.length === 0) return;
    setBusy(true);
    try {
      await api.client.compressFiles(id, currentDir, names);
      toast.success(`Archived ${names.length} item(s)`);
      await loadFiles(currentDir);
    } catch (e) {
      toast.error('Compress failed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function extractEntry(name: string) {
    if (!id) return;
    setBusy(true);
    try {
      await api.client.decompressFile(id, currentDir, name);
      toast.success('Extraction started');
      await loadFiles(currentDir);
    } catch (e) {
      toast.error('Extract failed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function downloadEntry(name: string) {
    if (!id) return;
    try {
      await api.client.downloadFile(id, joinPath(currentDir, name));
    } catch (e) {
      toast.error('Download failed', e instanceof Error ? e.message : undefined);
    }
  }

  const uploadFiles = useCallback(
    async (fileList: File[]) => {
      if (!id || fileList.length === 0) return;
      setUploadProgress(`Uploading ${fileList.length} file(s)…`);
      try {
        const res = await api.client.uploadFiles(id, currentDir, fileList);
        toast.success(`Uploaded ${res.uploaded} file(s)`);
        await loadFiles(currentDir);
      } catch (e) {
        toast.error('Upload failed', e instanceof Error ? e.message : undefined);
      } finally {
        setUploadProgress(null);
      }
    },
    [id, currentDir, loadFiles, toast],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!access.canCreateFiles) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) void uploadFiles(dropped);
  }

  const breadcrumbs = pathSegments(currentDir);
  const allSelected = visibleFiles.length > 0 && selected.size === visibleFiles.length;

  return (
    <ServerPage>
      <ServerPageHeader
        title="File manager"
        description="Browse, edit, upload and manage your server files"
        actions={
          <>
            <ServerToolbarButton icon={RefreshCw} label="Refresh" onClick={() => loadFiles(currentDir)} />
            {access.canCreateFiles && (
              <>
                <ServerToolbarButton icon={Upload} label="Upload" onClick={() => fileInputRef.current?.click()} />
                <ServerToolbarButton
                  icon={FolderPlus}
                  label="New folder"
                  onClick={() => setShowNewFolder((v) => !v)}
                  active={showNewFolder}
                />
              </>
            )}
          </>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length) void uploadFiles(list);
          e.target.value = '';
        }}
      />

      <section
        className={`file-manager-panel flex min-h-[480px] flex-col overflow-hidden rounded-xl border bg-[var(--surface)] transition ${
          dragOver ? 'border-[var(--accent)] ring-2 ring-[var(--accent-muted)]' : 'border-[var(--border)]'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (access.canCreateFiles) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-3 py-2.5">
          <nav className="flex flex-wrap items-center gap-1 text-xs" aria-label="Path">
            <BreadcrumbButton onClick={() => navigateTo('/')} active={currentDir === '/'}>
              <Home className="h-3.5 w-3.5" />
              <span>root</span>
            </BreadcrumbButton>
            {breadcrumbs.length > 1 &&
              breadcrumbs.slice(1).map((seg) => (
                <span key={seg.path} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-[var(--muted)]" />
                  <BreadcrumbButton onClick={() => navigateTo(seg.path)} active={seg.path === currentDir}>
                    {seg.label}
                  </BreadcrumbButton>
                </span>
              ))}
          </nav>

          <div className="mt-2 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter files…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] focus:ring-2 focus:ring-[var(--accent-muted)]"
              />
            </div>
            {currentDir !== '/' && (
              <button
                type="button"
                onClick={() => navigateTo(parentPath(currentDir))}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Up
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--accent-muted)]/30 px-3 py-2 text-xs">
            <span className="font-medium accent-text">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {access.canCreateFiles && (
                <Button size="sm" variant="subtle" disabled={busy} onClick={() => compressSelection([...selected])}>
                  <FileArchive className="h-3.5 w-3.5" /> Archive
                </Button>
              )}
              {access.canDeleteFiles && (
                <Button size="sm" variant="danger" disabled={busy} onClick={() => deleteEntries([...selected])}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {uploadProgress && (
          <div className="border-b border-[var(--border)] bg-[var(--info-bg)] px-3 py-2 text-xs" style={{ color: 'var(--info-fg)' }}>
            {uploadProgress}
          </div>
        )}

        {showNewFolder && access.canCreateFiles && (
          <form
            onSubmit={createFolder}
            className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--accent-muted)]/30 px-3 py-2.5"
          >
            <FolderPlus className="h-4 w-4 shrink-0 accent-text" />
            <input
              autoFocus
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="New folder name"
              required
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
            <Button type="submit" disabled={creatingFolder}>
              {creatingFolder ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowNewFolder(false)}>
              Cancel
            </Button>
          </form>
        )}

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : loadError ? (
            <div className="p-4">
              <EmptyState title="Could not load directory" description={loadError} />
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={search ? 'No matching files' : 'Empty directory'}
                description={
                  search
                    ? 'Try a different search term or clear the filter.'
                    : access.canCreateFiles
                      ? 'Drag & drop files here to upload, or create a folder.'
                      : 'This folder has no files yet.'
                }
              />
            </div>
          ) : (
            <table className="file-manager-table w-full text-left text-xs">
              <thead className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
                <tr className="text-[var(--muted)]">
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                      className="accent-[var(--accent)]"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="hidden w-24 px-3 py-2 font-medium sm:table-cell">Size</th>
                  <th className="hidden w-28 px-3 py-2 font-medium md:table-cell">Type</th>
                  <th className="w-32 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {visibleFiles.map((entry) => {
                  const Icon = getFileIcon(entry.name, entry.directory);
                  const fullPath = joinPath(currentDir, entry.name);
                  const isSel = selected.has(entry.name);
                  const archive = !entry.directory && isArchive(entry.name);

                  return (
                    <tr
                      key={entry.name}
                      className={`group border-b border-[var(--border)]/40 transition hover:bg-[var(--surface-hover)]/70 ${
                        isSel ? 'bg-[var(--accent-muted)]/40' : ''
                      }`}
                    >
                      <td className="px-2 py-0 text-center">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelect(entry.name)}
                          aria-label={`Select ${entry.name}`}
                          className="accent-[var(--accent)]"
                        />
                      </td>
                      <td className="px-3 py-0">
                        {renaming === entry.name ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenaming(null);
                            }}
                            className="my-1.5 w-full rounded-md border border-[var(--accent)] bg-[var(--bg-elevated)] px-2 py-1 text-xs outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            className="flex w-full min-w-0 items-center gap-2.5 py-2.5 text-left"
                            onClick={() => (entry.directory ? navigateTo(fullPath) : openFile(entry.name))}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                entry.directory
                                  ? 'bg-[var(--accent-muted)] accent-text'
                                  : 'bg-[var(--bg-elevated)] text-[var(--muted)]'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 truncate font-medium">{entry.name}</span>
                          </button>
                        )}
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-[var(--muted)] sm:table-cell">
                        {entry.directory ? '—' : entry.size != null ? formatBytes(entry.size) : '—'}
                      </td>
                      <td className="hidden px-3 py-2 text-[var(--muted)] md:table-cell">
                        {fileTypeLabel(entry.name, entry.directory)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                          {archive && access.canCreateFiles && (
                            <RowAction title="Extract" onClick={() => extractEntry(entry.name)}>
                              <FileArchive className="h-3.5 w-3.5" />
                            </RowAction>
                          )}
                          {!entry.directory && access.canReadFiles && (
                            <RowAction title="Download" onClick={() => downloadEntry(entry.name)}>
                              <Download className="h-3.5 w-3.5" />
                            </RowAction>
                          )}
                          {access.canCreateFiles && !entry.directory && (
                            <RowAction title="Duplicate" onClick={() => copyEntry(entry.name)}>
                              <Copy className="h-3.5 w-3.5" />
                            </RowAction>
                          )}
                          {access.canWriteFiles && (
                            <RowAction title="Rename" onClick={() => startRename(entry.name)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </RowAction>
                          )}
                          {access.canDeleteFiles && (
                            <RowAction title="Delete" danger onClick={() => deleteEntries([entry.name])}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </RowAction>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted)]">
          {loading ? 'Loading…' : `${visibleFiles.length} item${visibleFiles.length === 1 ? '' : 's'}`}
          {search && files.length !== visibleFiles.length ? ` · ${files.length} total` : ''}
          {access.canCreateFiles && ' · Drag & drop to upload'}
        </div>
      </section>
    </ServerPage>
  );
}

function RowAction({
  children,
  title,
  onClick,
  danger,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 transition hover:bg-[var(--surface-hover)]"
      style={{ color: danger ? 'var(--danger-fg)' : 'var(--muted)' }}
    >
      {children}
    </button>
  );
}

function BreadcrumbButton({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition ${
        active
          ? 'bg-[var(--accent-muted)] font-medium accent-text'
          : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  );
}

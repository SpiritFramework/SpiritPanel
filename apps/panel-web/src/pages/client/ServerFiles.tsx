import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  ChevronRight,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FolderPlus,
  FolderInput,
  Grid3x3,
  Home,
  List,
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
  type FileEntry,
} from '../../lib/file-manager';
import { useServer } from '../../context/ServerContext';
import { useServerManageBase } from '../../hooks/useServerRouteId';
import { useToast } from '../../context/ToastContext';
import { getServerAccess } from '../../lib/server-access';
import { FilterSelect } from '../../components/Layout';
import { EmptyState, Spinner } from '../../components/ui';
import { ServerPage, ServerPageHeader, ServerToolbarButton } from '../../components/server/ServerPage';
import { MoveFilesDialog, type MoveFileItem } from '../../components/files/MoveFilesDialog';

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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'type'>('name');

  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [creatingFile, setCreatingFile] = useState(false);
  const [moveItems, setMoveItems] = useState<MoveFileItem[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleFiles = useMemo(() => {
    let filtered = filterFileEntries(files, search);
    return [...filtered].sort((a, b) => {
      // Folders always come first
      if (a.directory && !b.directory) return -1;
      if (!a.directory && b.directory) return 1;
      // Then sort by selected criteria
      switch (sortBy) {
        case 'size':
          return (b.size ?? 0) - (a.size ?? 0);
        case 'type':
          return a.name.split('.').pop()?.localeCompare(b.name.split('.').pop() ?? '') ?? 0;
        case 'name':
        default:
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
    });
  }, [files, search, sortBy]);

  const loadFiles = useCallback(
    async (dir: string) => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      setSelected(new Set());
      try {
        const res = (await api.client.files(id, dir)) as { data?: FileEntry[] } | FileEntry[];
        const list = Array.isArray(res) ? res : (res.data ?? []);
        setFiles(list);
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
    setSelectedFile(null);
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
    const file = files.find(f => f.name === name);
    if (file) setSelectedFile(file);
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
      setSelectedFile(null);
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

  async function createFile(e: FormEvent) {
    e.preventDefault();
    if (!id || !newFileName.trim()) return;
    setCreatingFile(true);
    try {
      await api.client.writeFile(id, joinPath(currentDir, newFileName.trim()), '');
      setNewFileName('');
      setShowNewFile(false);
      await loadFiles(currentDir);
      toast.success('File created');
    } catch (err) {
      toast.error('Could not create file', err instanceof Error ? err.message : undefined);
    } finally {
      setCreatingFile(false);
    }
  }

  function startRename(name: string) {
    setRenaming(name);
    setRenameValue(name);
  }

  function openMove(names: string[]) {
    if (names.length === 0) return;
    setMoveItems(
      names.map((name) => {
        const entry = files.find((f) => f.name === name);
        return {
          name,
          directory: entry?.directory ?? false,
          sourcePath: joinPath(currentDir, name),
        };
      }),
    );
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
      setSelectedFile(null);
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
      setSelectedFile(null);
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
                  icon={FileCode2}
                  label="New file"
                  onClick={() => setShowNewFile((v) => !v)}
                  active={showNewFile}
                />
                <ServerToolbarButton
                  icon={FolderPlus}
                  label="New folder"
                  onClick={() => setShowNewFolder((v) => !v)}
                  active={showNewFolder}
                />
              </>
            )}
            <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`rounded px-2 py-1.5 transition ${
                  viewMode === 'list'
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded px-2 py-1.5 transition ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
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

      <div className="flex gap-3">
        <section
          className={`file-manager-panel flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-xl border bg-[var(--surface)] transition ${
            dragOver ? 'border-[var(--accent)] ring-2 ring-[var(--accent-muted)]' : 'border-[var(--border)]'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (access.canCreateFiles) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {/* Header with breadcrumb and search */}
          <div className="space-y-4 border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-4">
            {/* Breadcrumb Navigation */}
            <nav className="flex flex-wrap items-center gap-1 text-xs" aria-label="Path">
              <BreadcrumbButton onClick={() => navigateTo('/')} active={currentDir === '/'}>
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">root</span>
              </BreadcrumbButton>
              {breadcrumbs.map((seg) => (
                  <span key={seg.path} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 text-[var(--muted)]" />
                    <BreadcrumbButton onClick={() => navigateTo(seg.path)} active={seg.path === currentDir}>
                      {seg.label}
                    </BreadcrumbButton>
                  </span>
                ))}
              {currentDir !== '/' && (
                <span className="ml-auto">
                  <button
                    type="button"
                    onClick={() => navigateTo(parentPath(currentDir))}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)] active:bg-[var(--surface)]"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Up</span>
                  </button>
                </span>
              )}
            </nav>

            {/* Search and Sort Controls */}
            <div className="flex gap-3 flex-col sm:flex-row items-stretch">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-9 pr-3 text-sm font-medium outline-none transition focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] focus:ring-2 focus:ring-[var(--accent-muted)]"
                />
              </div>
              <FilterSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'type')}
              >
                <option value="name">Sort: Name</option>
                <option value="size">Sort: Size</option>
                <option value="type">Sort: Type</option>
              </FilterSelect>
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--accent-muted)]/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold accent-text text-sm">{selected.size} item{selected.size !== 1 ? 's' : ''} selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {access.canWriteFiles && (
                  <ActionButton
                    variant="subtle"
                    disabled={busy}
                    onClick={() => openMove([...selected])}
                  >
                    <FolderInput className="h-4 w-4" />
                    <span className="hidden sm:inline">Move</span>
                  </ActionButton>
                )}
                {access.canCreateFiles && (
                  <ActionButton
                    variant="subtle"
                    disabled={busy}
                    onClick={() => compressSelection([...selected])}
                  >
                    <FileArchive className="h-4 w-4" />
                    <span className="hidden sm:inline">Archive</span>
                  </ActionButton>
                )}
                {access.canDeleteFiles && (
                  <ActionButton
                    variant="danger"
                    disabled={busy}
                    onClick={() => deleteEntries([...selected])}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </ActionButton>
                )}
                <ActionButton variant="ghost" onClick={() => setSelected(new Set())}>
                  Cancel
                </ActionButton>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploadProgress && (
            <div className="border-b border-[var(--border)] bg-[var(--info-bg)] px-4 py-3 text-sm" style={{ color: 'var(--info-fg)' }}>
              {uploadProgress}
            </div>
          )}

          {/* Create folder form */}
          {showNewFolder && access.canCreateFiles && (
            <form
              onSubmit={createFolder}
              className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--accent-muted)]/30 px-4 py-3"
            >
              <FolderPlus className="h-5 w-5 shrink-0 accent-text" />
              <input
                autoFocus
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="New folder name…"
                required
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
              />
              <div className="flex gap-2">
                <ActionButton type="submit" disabled={creatingFolder}>
                  {creatingFolder ? 'Creating…' : 'Create'}
                </ActionButton>
                <ActionButton type="button" variant="ghost" onClick={() => setShowNewFolder(false)}>
                  Cancel
                </ActionButton>
              </div>
            </form>
          )}

          {/* Create file form */}
          {showNewFile && access.canCreateFiles && (
            <form
              onSubmit={createFile}
              className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--accent-muted)]/30 px-4 py-3"
            >
              <FileCode2 className="h-5 w-5 shrink-0 accent-text" />
              <input
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="New file name (e.g., config.txt)…"
                required
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
              />
              <div className="flex gap-2">
                <ActionButton type="submit" disabled={creatingFile}>
                  {creatingFile ? 'Creating…' : 'Create'}
                </ActionButton>
                <ActionButton type="button" variant="ghost" onClick={() => setShowNewFile(false)}>
                  Cancel
                </ActionButton>
              </div>
            </form>
          )}

          {/* File list/grid */}
          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="h-8 w-8" />
                  <p className="text-sm text-[var(--muted)]">Loading files…</p>
                </div>
              </div>
            ) : loadError ? (
              <div className="p-6">
                <EmptyState title="Could not load directory" description={loadError} />
              </div>
            ) : visibleFiles.length === 0 ? (
              <div className="p-6">
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
            ) : viewMode === 'grid' ? (
              <FileGridView
                files={visibleFiles}
                selected={selected}
                renaming={renaming}
                renameValue={renameValue}
                onSelect={toggleSelect}
                onNavigate={navigateTo}
                onOpenFile={openFile}
                onRename={startRename}
                onRenameChange={setRenameValue}
                onCommitRename={commitRename}
                onDownload={downloadEntry}
                onExtract={extractEntry}
                onCopy={copyEntry}
                onMove={(name) => openMove([name])}
                onDelete={(name) => deleteEntries([name])}
                access={access}
                busy={busy}
                currentDir={currentDir}
              />
            ) : (
              <FileListView
                files={visibleFiles}
                selected={selected}
                renaming={renaming}
                renameValue={renameValue}
                allSelected={allSelected}
                onSelectAll={toggleSelectAll}
                onSelect={toggleSelect}
                onNavigate={navigateTo}
                onOpenFile={openFile}
                onRename={startRename}
                onRenameChange={setRenameValue}
                onCommitRename={commitRename}
                onDownload={downloadEntry}
                onExtract={extractEntry}
                onCopy={copyEntry}
                onMove={(name) => openMove([name])}
                onDelete={(name) => deleteEntries([name])}
                access={access}
                busy={busy}
                currentDir={currentDir}
              />
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)]/40 px-4 py-3 text-xs text-[var(--muted)]">
            {loading ? 'Loading…' : `${visibleFiles.length} item${visibleFiles.length === 1 ? '' : 's'}`}
            {search && files.length !== visibleFiles.length ? ` · ${files.length} total` : ''}
            {access.canCreateFiles && ' · Drag & drop to upload'}
          </div>
        </section>

        {/* File Details Sidebar */}
        {selectedFile && (
          <FileDetailsSidebar file={selectedFile} currentDir={currentDir} />
        )}
      </div>

      {moveItems && id && (
        <MoveFilesDialog
          serverId={id}
          items={moveItems}
          currentDir={currentDir}
          onClose={() => setMoveItems(null)}
          onMoved={() => {
            toast.success(`Moved ${moveItems.length} item${moveItems.length === 1 ? '' : 's'}`);
            setSelected(new Set());
            setSelectedFile(null);
            void loadFiles(currentDir);
          }}
        />
      )}
    </ServerPage>
  );
}

// ===== List View Component =====
function FileListView({
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
  busy,
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
  busy: boolean;
  currentDir: string;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <tr className="text-xs text-[var(--muted)]">
          <th className="w-12 px-4 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
              aria-label="Select all"
              className="accent-[var(--accent)]"
            />
          </th>
          <th className="px-4 py-3 font-semibold">Name</th>
          <th className="hidden w-24 px-4 py-3 font-semibold text-right sm:table-cell">Size</th>
          <th className="hidden w-32 px-4 py-3 font-semibold md:table-cell">Type</th>
          <th className="w-32 px-4 py-3" />
        </tr>
      </thead>
      <tbody>
        {files.map((entry) => {
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
              <td className="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => onSelect(entry.name)}
                  aria-label={`Select ${entry.name}`}
                  className="accent-[var(--accent)]"
                />
              </td>
              <td className="px-4 py-3">
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
                    className="w-full rounded-md border border-[var(--accent)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center gap-3 text-left transition hover:text-[var(--text)]"
                    onClick={() => (entry.directory ? onNavigate(fullPath) : onOpenFile(entry.name))}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        entry.directory
                          ? 'bg-[var(--accent-muted)] accent-text'
                          : 'bg-[var(--bg-elevated)] text-[var(--muted)]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate font-medium">{entry.name}</span>
                  </button>
                )}
              </td>
              <td className="hidden px-4 py-3 tabular-nums text-[var(--muted)] text-right sm:table-cell">
                {entry.directory ? '—' : entry.size != null ? formatBytes(entry.size) : '—'}
              </td>
              <td className="hidden px-4 py-3 text-[var(--muted)] md:table-cell text-sm">
                {fileTypeLabel(entry.name, entry.directory)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  {archive && access.canCreateFiles && (
                    <FileActionButton title="Extract" onClick={() => onExtract(entry.name)}>
                      <FileArchive className="h-4 w-4" />
                    </FileActionButton>
                  )}
                  {!entry.directory && access.canReadFiles && (
                    <FileActionButton title="Download" onClick={() => onDownload(entry.name)}>
                      <Download className="h-4 w-4" />
                    </FileActionButton>
                  )}
                  {access.canCreateFiles && !entry.directory && (
                    <FileActionButton title="Duplicate" onClick={() => onCopy(entry.name)}>
                      <Copy className="h-4 w-4" />
                    </FileActionButton>
                  )}
                  {access.canWriteFiles && (
                    <FileActionButton title="Move" onClick={() => onMove(entry.name)}>
                      <FolderInput className="h-4 w-4" />
                    </FileActionButton>
                  )}
                  {access.canWriteFiles && (
                    <FileActionButton title="Rename" onClick={() => onRename(entry.name)}>
                      <Pencil className="h-4 w-4" />
                    </FileActionButton>
                  )}
                  {access.canDeleteFiles && (
                    <FileActionButton title="Delete" danger onClick={() => onDelete(entry.name)}>
                      <Trash2 className="h-4 w-4" />
                    </FileActionButton>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ===== Grid View Component =====
function FileGridView({
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
  busy,
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
  busy: boolean;
  currentDir: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {files.map((entry) => {
        const Icon = getFileIcon(entry.name, entry.directory);
        const fullPath = joinPath(currentDir, entry.name);
        const isSel = selected.has(entry.name);
        const archive = !entry.directory && isArchive(entry.name);

        return (
          <div
            key={entry.name}
            className={`group relative rounded-lg border transition ${
              isSel
                ? 'border-[var(--accent)] bg-[var(--accent-muted)]/40'
                : 'border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:border-[var(--accent-muted)] hover:bg-[var(--accent-muted)]/20'
            }`}
          >
            {/* Selection checkbox */}
            <input
              type="checkbox"
              checked={isSel}
              onChange={() => onSelect(entry.name)}
              className="absolute top-2 left-2 accent-[var(--accent)]"
            />

            {/* File icon/preview */}
            <div
              className="flex cursor-pointer items-center justify-center p-4 pt-8"
              onClick={() => (entry.directory ? onNavigate(fullPath) : onOpenFile(entry.name))}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  entry.directory
                    ? 'bg-[var(--accent-muted)] accent-text'
                    : 'bg-[var(--surface)] text-[var(--muted)]'
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>

            {/* File name */}
            <div className="border-t border-[var(--border)]/40 px-3 py-2">
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
                  className="w-full rounded border border-[var(--accent)] bg-[var(--bg-elevated)] px-1.5 py-1 text-xs outline-none"
                />
              ) : (
                <p className="truncate text-center text-xs font-medium" title={entry.name}>
                  {entry.name}
                </p>
              )}
              <p className="text-center text-[10px] text-[var(--muted)]">
                {entry.directory ? '—' : entry.size != null ? formatBytes(entry.size) : '—'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-0.5 border-t border-[var(--border)]/40 bg-[var(--bg-elevated)]/50 p-1 opacity-0 transition group-hover:opacity-100">
              {archive && access.canCreateFiles && (
                <FileActionButton
                  title="Extract"
                  onClick={() => onExtract(entry.name)}
                  size="sm"
                >
                  <FileArchive className="h-3.5 w-3.5" />
                </FileActionButton>
              )}
              {!entry.directory && access.canReadFiles && (
                <FileActionButton
                  title="Download"
                  onClick={() => onDownload(entry.name)}
                  size="sm"
                >
                  <Download className="h-3.5 w-3.5" />
                </FileActionButton>
              )}
              {access.canCreateFiles && !entry.directory && (
                <FileActionButton
                  title="Duplicate"
                  onClick={() => onCopy(entry.name)}
                  size="sm"
                >
                  <Copy className="h-3.5 w-3.5" />
                </FileActionButton>
              )}
              {access.canWriteFiles && (
                <FileActionButton
                  title="Move"
                  onClick={() => onMove(entry.name)}
                  size="sm"
                >
                  <FolderInput className="h-3.5 w-3.5" />
                </FileActionButton>
              )}
              {access.canWriteFiles && (
                <FileActionButton
                  title="Rename"
                  onClick={() => onRename(entry.name)}
                  size="sm"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </FileActionButton>
              )}
              {access.canDeleteFiles && (
                <FileActionButton
                  title="Delete"
                  onClick={() => onDelete(entry.name)}
                  danger
                  size="sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </FileActionButton>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== File Details Sidebar =====
function FileDetailsSidebar({
  file,
  currentDir,
}: {
  file: FileEntry;
  currentDir: string;
}) {
  return (
    <aside className="hidden w-72 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:flex">
      <h3 className="mb-4 font-semibold text-sm">File Details</h3>
      <div className="space-y-4 text-xs">
        <div>
          <p className="text-[var(--muted)] mb-1">Name</p>
          <p className="font-mono break-all">{file.name}</p>
        </div>
        <div>
          <p className="text-[var(--muted)] mb-1">Type</p>
          <p>{fileTypeLabel(file.name, file.directory)}</p>
        </div>
        {!file.directory && file.size !== undefined && (
          <div>
            <p className="text-[var(--muted)] mb-1">Size</p>
            <p>{formatBytes(file.size)}</p>
          </div>
        )}
        {file.modified && (
          <div>
            <p className="text-[var(--muted)] mb-1">Modified</p>
            <p>{new Date(file.modified).toLocaleString()}</p>
          </div>
        )}
        <div>
          <p className="text-[var(--muted)] mb-1">Location</p>
          <p className="font-mono break-all text-[10px]">{currentDir}</p>
        </div>
      </div>
    </aside>
  );
}

// ===== Helper Components =====
function FileActionButton({
  children,
  title,
  onClick,
  danger,
  size = 'md',
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md transition-colors duration-150 ${
        size === 'sm' ? 'p-1.5 hover:bg-[#1a2332]' : 'p-2 hover:bg-[var(--surface-hover)]'
      }`}
      style={{ color: danger ? 'var(--danger-fg)' : 'var(--muted)' }}
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  variant = 'default',
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  variant?: 'default' | 'subtle' | 'ghost' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const variants = {
    default: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent)]',
    subtle: 'bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent-muted)]/80 active:bg-[var(--accent-muted)]',
    ghost: 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] border border-[var(--border)] active:bg-[var(--surface)]',
    danger: 'bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 active:bg-[var(--danger)]',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${variants[variant]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
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
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
        active
          ? 'bg-[var(--accent-muted)] accent-text'
          : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] active:bg-[var(--surface)]'
      }`}
    >
      {children}
    </button>
  );
}

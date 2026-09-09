import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { joinPath, parentPath } from '../lib/paths';
import { filterFileEntries, type FileEntry } from '../lib/file-manager';
import { useServer } from '../context/ServerContext';
import { useServerManageBase } from './useServerRouteId';
import { useToast } from '../context/ToastContext';
import { getServerAccess } from '../lib/server-access';
import type { MoveFileItem } from '../components/files/MoveFilesDialog';

export type FilesSortBy = 'name' | 'size' | 'type';
export type FilesViewMode = 'list' | 'grid';

export function useServerFiles() {
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
  const [viewMode, setViewMode] = useState<FilesViewMode>('list');
  const [sortBy, setSortBy] = useState<FilesSortBy>('name');

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
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleFiles = useMemo(() => {
    const filtered = filterFileEntries(files, search);
    return [...filtered].sort((a, b) => {
      if (a.directory && !b.directory) return -1;
      if (!a.directory && b.directory) return 1;
      switch (sortBy) {
        case 'size':
          return (b.size ?? 0) - (a.size ?? 0);
        case 'type':
          return (a.name.split('.').pop() ?? '').localeCompare(b.name.split('.').pop() ?? '');
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
    navigate(`${base}/files/edit?file=${encodeURIComponent(filePath)}&dir=${encodeURIComponent(currentDir)}`);
  }

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    const file = files.find((f) => f.name === name);
    if (file) setSelectedFile(file);
  }

  function toggleSelectAll() {
    if (selected.size === visibleFiles.length) setSelected(new Set());
    else setSelected(new Set(visibleFiles.map((f) => f.name)));
  }

  async function deleteEntries(names: string[]) {
    if (!id || names.length === 0) return;
    setPendingDelete(names);
  }

  async function confirmDelete() {
    if (!id || !pendingDelete || pendingDelete.length === 0) return;
    const names = pendingDelete;
    setDeleteLoading(true);
    setBusy(true);
    try {
      await api.client.deleteFiles(id, currentDir, names);
      toast.success(`Deleted ${names.length} item(s)`);
      setPendingDelete(null);
      await loadFiles(currentDir);
      setSelectedFile(null);
    } catch (e) {
      toast.error('Delete failed', e instanceof Error ? e.message : undefined);
    } finally {
      setDeleteLoading(false);
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

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!access.canCreateFiles) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) void uploadFiles(dropped);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (access.canCreateFiles) setDragOver(true);
  }

  const allSelected = visibleFiles.length > 0 && selected.size === visibleFiles.length;
  const folderCount = visibleFiles.filter((f) => f.directory).length;
  const fileCount = visibleFiles.length - folderCount;

  return {
    server,
    access,
    id,
    currentDir,
    files,
    visibleFiles,
    loading,
    loadError,
    search,
    setSearch,
    selected,
    setSelected,
    busy,
    dragOver,
    setDragOver,
    uploadProgress,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    newFolder,
    setNewFolder,
    showNewFolder,
    setShowNewFolder,
    creatingFolder,
    renaming,
    renameValue,
    setRenameValue,
    selectedFile,
    setSelectedFile,
    newFileName,
    setNewFileName,
    showNewFile,
    setShowNewFile,
    creatingFile,
    moveItems,
    setMoveItems,
    pendingDelete,
    setPendingDelete,
    deleteLoading,
    confirmDelete,
    fileInputRef,
    allSelected,
    folderCount,
    fileCount,
    navigateTo,
    openFile,
    toggleSelect,
    toggleSelectAll,
    deleteEntries,
    createFolder,
    createFile,
    startRename,
    openMove,
    commitRename,
    copyEntry,
    compressSelection,
    extractEntry,
    downloadEntry,
    uploadFiles,
    onDrop,
    onDragOver,
    loadFiles,
    parentPath,
  };
}

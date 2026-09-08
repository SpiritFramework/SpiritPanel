import { EmptyState, Spinner } from '../../ui';
import { FilesToolbar } from './FilesToolbar';
import { FilesBulkBar } from './FilesBulkBar';
import { FilesCreateBar } from './FilesCreateBar';
import { FilesListView } from './FilesListView';
import { FilesGridView } from './FilesGridView';
import type { useServerFiles } from '../../../hooks/useServerFiles';

type FilesState = ReturnType<typeof useServerFiles>;

export function FilesExplorerPanel({
  fm,
  dragOver,
  onDragLeave,
}: {
  fm: FilesState;
  dragOver: boolean;
  onDragLeave: () => void;
}) {
  const {
    access,
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
    uploadProgress,
    viewMode,
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
    newFileName,
    setNewFileName,
    showNewFile,
    setShowNewFile,
    creatingFile,
    allSelected,
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
    onDrop,
    onDragOver,
    parentPath,
  } = fm;

  return (
    <section
      className={`ds-srv-fm-explorer${dragOver ? ' ds-srv-fm-explorer--drag' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <FilesToolbar
        currentDir={currentDir}
        search={search}
        sortBy={sortBy}
        onNavigate={navigateTo}
        onParent={() => navigateTo(parentPath(currentDir))}
        onSearchChange={setSearch}
        onSortChange={setSortBy}
      />

      {selected.size > 0 ? (
        <FilesBulkBar
          count={selected.size}
          busy={busy}
          access={access}
          onMove={() => openMove([...selected])}
          onArchive={() => compressSelection([...selected])}
          onDelete={() => deleteEntries([...selected])}
          onClear={() => setSelected(new Set())}
        />
      ) : null}

      {uploadProgress ? <div className="ds-srv-fm-upload-banner">{uploadProgress}</div> : null}

      {showNewFolder && access.canCreateFiles ? (
        <FilesCreateBar
          mode="folder"
          value={newFolder}
          busy={creatingFolder}
          onChange={setNewFolder}
          onSubmit={createFolder}
          onCancel={() => setShowNewFolder(false)}
        />
      ) : null}

      {showNewFile && access.canCreateFiles ? (
        <FilesCreateBar
          mode="file"
          value={newFileName}
          busy={creatingFile}
          onChange={setNewFileName}
          onSubmit={createFile}
          onCancel={() => setShowNewFile(false)}
        />
      ) : null}

      <div className="ds-srv-fm-viewport">
        {loading ? (
          <div className="ds-srv-fm-loading">
            <Spinner className="h-8 w-8" />
            <p>Loading files…</p>
          </div>
        ) : loadError ? (
          <div className="ds-srv-fm-empty-wrap">
            <EmptyState title="Could not load directory" description={loadError} />
          </div>
        ) : visibleFiles.length === 0 ? (
          <div className="ds-srv-fm-empty-wrap">
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
          <FilesGridView
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
            currentDir={currentDir}
          />
        ) : (
          <FilesListView
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
            currentDir={currentDir}
          />
        )}
      </div>

      <footer className="ds-srv-fm-footer">
        {loading
          ? 'Loading…'
          : `${visibleFiles.length} item${visibleFiles.length === 1 ? '' : 's'}`}
        {search && files.length !== visibleFiles.length ? ` · ${files.length} total` : ''}
        {access.canCreateFiles ? ' · Drag & drop to upload' : ''}
      </footer>
    </section>
  );
}

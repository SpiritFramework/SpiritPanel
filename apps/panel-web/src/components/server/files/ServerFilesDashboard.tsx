import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useServerFiles } from '../../../hooks/useServerFiles';
import { MoveFilesDialog } from '../../files/MoveFilesDialog';
import { FilesHeader } from './FilesHeader';
import { FilesStatsRow } from './FilesStatsRow';
import { FilesExplorerPanel } from './FilesExplorerPanel';
import { FilesDetailPanel } from './FilesDetailPanel';

export function ServerFilesDashboard() {
  const fm = useServerFiles();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const {
    server,
    access,
    id,
    currentDir,
    visibleFiles,
    dragOver,
    setDragOver,
    selected,
    setSelected,
    selectedFile,
    moveItems,
    setMoveItems,
    fileInputRef,
    folderCount,
    fileCount,
    search,
    viewMode,
    setViewMode,
    showNewFile,
    setShowNewFile,
    showNewFolder,
    setShowNewFolder,
    loadFiles,
    uploadFiles,
  } = fm;

  async function handleRefresh() {
    setRefreshing(true);
    await loadFiles(currentDir);
    window.setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <>
      <div className="ds-srv-fm-shell">
        <FilesHeader
          serverName={server.name}
          eggName={server.egg.name}
          eggLogoUrl={server.egg.logoUrl}
          itemCount={visibleFiles.length}
          currentDir={currentDir}
          refreshing={refreshing}
          canCreate={access.canCreateFiles}
          viewMode={viewMode}
          showNewFile={showNewFile}
          showNewFolder={showNewFolder}
          onRefresh={() => void handleRefresh()}
          onUpload={() => fileInputRef.current?.click()}
          onToggleNewFile={() => setShowNewFile((v) => !v)}
          onToggleNewFolder={() => setShowNewFolder((v) => !v)}
          onViewModeChange={setViewMode}
        />

        <div className="ds-srv-fm-body">
          <FilesStatsRow
            folderCount={folderCount}
            fileCount={fileCount}
            selectedCount={selected.size}
            hasSearch={Boolean(search)}
            canUpload={access.canCreateFiles}
          />

          <div className="ds-srv-fm-layout">
            <FilesExplorerPanel fm={fm} dragOver={dragOver} onDragLeave={() => setDragOver(false)} />
            {selectedFile ? <FilesDetailPanel file={selectedFile} currentDir={currentDir} /> : null}
          </div>
        </div>
      </div>

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

      {moveItems && id ? (
        <MoveFilesDialog
          serverId={id}
          items={moveItems}
          currentDir={currentDir}
          onClose={() => setMoveItems(null)}
          onMoved={() => {
            toast.success(`Moved ${moveItems.length} item${moveItems.length === 1 ? '' : 's'}`);
            setSelected(new Set());
            fm.setSelectedFile(null);
            void loadFiles(currentDir);
          }}
        />
      ) : null}
    </>
  );
}

import { FileCode2, FolderPlus, Grid3x3, List, RefreshCw, Upload } from 'lucide-react';
import { StatusPill } from '../../ui';
import { ServerEggIcon } from '../../ServerEggIcon';

export function FilesHeader({
  serverName,
  eggName,
  eggLogoUrl,
  itemCount,
  currentDir,
  refreshing,
  canCreate,
  viewMode,
  showNewFile,
  showNewFolder,
  onRefresh,
  onUpload,
  onToggleNewFile,
  onToggleNewFolder,
  onViewModeChange,
}: {
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  itemCount: number;
  currentDir: string;
  refreshing: boolean;
  canCreate: boolean;
  viewMode: 'list' | 'grid';
  showNewFile: boolean;
  showNewFolder: boolean;
  onRefresh: () => void;
  onUpload: () => void;
  onToggleNewFile: () => void;
  onToggleNewFolder: () => void;
  onViewModeChange: (mode: 'list' | 'grid') => void;
}) {
  const dirLabel = currentDir === '/' ? 'root' : currentDir.split('/').pop() ?? 'root';

  return (
    <header className="ds-srv-fm-header">
      <div className="ds-srv-fm-header-accent" aria-hidden />

      <div className="ds-srv-fm-header-body">
        <div className="ds-srv-fm-header-main">
          <div className="ds-srv-fm-header-identity">
            <div className="ds-srv-fm-header-icon-wrap" aria-hidden>
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-5 w-5" iconClassName="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-fm-header-title-row">
                <h1 className="ds-srv-fm-header-title truncate">{serverName}</h1>
                <span className="ds-srv-fm-header-sep" aria-hidden>
                  /
                </span>
                <span className="ds-srv-fm-header-route">Files</span>
                <StatusPill label={dirLabel} tone="neutral" compact />
              </div>
              <p className="ds-srv-fm-header-meta truncate">
                Browse, upload, edit &amp; manage server files
              </p>
            </div>
          </div>

          <div className="ds-srv-fm-header-actions">
            {itemCount > 0 ? (
              <span className="ds-srv-fm-header-count">{itemCount} items</span>
            ) : null}
            <button
              type="button"
              className="ds-srv-fm-action-btn"
              title="Refresh directory"
              aria-label="Refresh directory"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' animate-spin' : ''}`} aria-hidden />
            </button>
            {canCreate ? (
              <>
                <button type="button" className="ds-srv-fm-action-btn" title="Upload files" aria-label="Upload files" onClick={onUpload}>
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={`ds-srv-fm-action-btn${showNewFile ? ' ds-srv-fm-action-btn--active' : ''}`}
                  title="New file"
                  aria-label="New file"
                  onClick={onToggleNewFile}
                >
                  <FileCode2 className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={`ds-srv-fm-action-btn${showNewFolder ? ' ds-srv-fm-action-btn--active' : ''}`}
                  title="New folder"
                  aria-label="New folder"
                  onClick={onToggleNewFolder}
                >
                  <FolderPlus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </>
            ) : null}
            <div className="ds-srv-fm-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={`ds-srv-fm-view-btn${viewMode === 'list' ? ' ds-srv-fm-view-btn--active' : ''}`}
                title="List view"
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                onClick={() => onViewModeChange('list')}
              >
                <List className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className={`ds-srv-fm-view-btn${viewMode === 'grid' ? ' ds-srv-fm-view-btn--active' : ''}`}
                title="Grid view"
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                onClick={() => onViewModeChange('grid')}
              >
                <Grid3x3 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="ds-srv-fm-header-kicker" aria-hidden>
          <FolderPlus className="h-3 w-3" />
          <span>File manager</span>
        </div>
      </div>
    </header>
  );
}

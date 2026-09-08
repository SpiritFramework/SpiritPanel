import { fileTypeLabel, formatBytes, type FileEntry } from '../../../lib/file-manager';

export function FilesDetailPanel({ file, currentDir }: { file: FileEntry; currentDir: string }) {
  return (
    <aside className="ds-srv-fm-detail">
      <h3 className="ds-srv-fm-detail-title">File details</h3>
      <dl className="ds-srv-fm-detail-list">
        <div className="ds-srv-fm-detail-item">
          <dt>Name</dt>
          <dd className="ds-srv-fm-detail-mono">{file.name}</dd>
        </div>
        <div className="ds-srv-fm-detail-item">
          <dt>Type</dt>
          <dd>{fileTypeLabel(file.name, file.directory)}</dd>
        </div>
        {!file.directory && file.size !== undefined ? (
          <div className="ds-srv-fm-detail-item">
            <dt>Size</dt>
            <dd>{formatBytes(file.size)}</dd>
          </div>
        ) : null}
        {file.modified ? (
          <div className="ds-srv-fm-detail-item">
            <dt>Modified</dt>
            <dd>{new Date(file.modified).toLocaleString()}</dd>
          </div>
        ) : null}
        <div className="ds-srv-fm-detail-item">
          <dt>Location</dt>
          <dd className="ds-srv-fm-detail-mono ds-srv-fm-detail-mono--sm">{currentDir}</dd>
        </div>
      </dl>
    </aside>
  );
}

import { Link, useSearchParams } from 'react-router-dom';
import { parentPath } from '../../lib/paths';
import { useServerManageBase } from '../../hooks/useServerRouteId';
import { ServerPage } from '../../components/server/ServerPage';
import { FileEditorWorkspace } from '../../components/server/files/FileEditorWorkspace';

export function ServerFileEditPage() {
  const { base } = useServerManageBase();
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('file') ?? '';
  const returnDir = searchParams.get('dir') ?? parentPath(filePath);
  const filesUrl = `${base}/files?dir=${encodeURIComponent(returnDir)}`;

  if (!filePath) {
    return (
      <ServerPage>
        <div className="ds-srv-fe-empty">
          <p>No file specified.</p>
          <Link to={filesUrl} className="ds-srv-fe-empty-link">
            ← Back to files
          </Link>
        </div>
      </ServerPage>
    );
  }

  return (
    <ServerPage fullHeight className="min-h-0">
      <FileEditorWorkspace filePath={filePath} />
    </ServerPage>
  );
}

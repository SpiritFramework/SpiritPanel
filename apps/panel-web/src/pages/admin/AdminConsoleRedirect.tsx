import { Navigate, useParams } from 'react-router-dom';

export function AdminConsoleRedirect() {
  const { serverId = '' } = useParams();
  return <Navigate to={`/admin/servers/${serverId}/manage/console`} replace />;
}

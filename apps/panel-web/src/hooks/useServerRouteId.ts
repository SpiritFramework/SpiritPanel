import { useLocation, useParams } from 'react-router-dom';

/** Resolve server id from client (`/servers/:id`) or admin manage (`/admin/servers/:serverId/manage`) routes. */
export function useServerRouteId(): string {
  const { id, serverId } = useParams<{ id?: string; serverId?: string }>();
  return id ?? serverId ?? '';
}

/** Base path for server manage UI — client or admin support shell. */
export function useServerManageBase(): { serverId: string; base: string; isAdminManage: boolean } {
  const serverId = useServerRouteId();
  const location = useLocation();
  const isAdminManage = location.pathname.includes('/admin/servers/');
  const base = isAdminManage ? `/admin/servers/${serverId}/manage` : `/servers/${serverId}`;
  return { serverId, base, isAdminManage };
}

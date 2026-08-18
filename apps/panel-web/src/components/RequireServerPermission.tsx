import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useServer } from '../context/ServerContext';
import { getServerAccess } from '../lib/server-access';

const PERMISSION_FLAGS = [
  'canConsole',
  'canStart',
  'canStop',
  'canRestart',
  'canReadFiles',
  'canWriteFiles',
  'canCreateFiles',
  'canDeleteFiles',
  'canReadStartup',
  'canUpdateStartup',
  'canReadDatabases',
  'canCreateDatabases',
  'canDeleteDatabases',
  'canViewDatabasePassword',
  'canManageSubusers',
  'canUpdateSettings',
  'canReinstall',
  'canReadBackups',
  'canCreateBackups',
  'canDeleteBackups',
  'canReadSchedules',
  'canManageSchedules',
  'canReadAllocations',
  'canCreateAllocations',
  'canUpdateAllocations',
  'canDeleteAllocations',
  'canInstallMarketplace',
] as const;

export type ServerPermissionFlag = (typeof PERMISSION_FLAGS)[number];

export function RequireServerPermission({
  flag,
  redirectTo = 'console',
  children,
}: {
  flag: ServerPermissionFlag;
  redirectTo?: string;
  children: ReactNode;
}) {
  const { server } = useServer();
  const access = getServerAccess(server);

  if (!access[flag]) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

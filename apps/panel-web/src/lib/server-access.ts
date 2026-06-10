import type { AdminServerDetail, ServerAccessFlags, ServerDetail } from './api';

const FULL_ACCESS: ServerAccessFlags = {
  isOwner: true,
  isAdminSupport: false,
  permissions: ['*'],
  canConsole: true,
  canStart: true,
  canStop: true,
  canRestart: true,
  canReadFiles: true,
  canWriteFiles: true,
  canCreateFiles: true,
  canDeleteFiles: true,
  canReadStartup: true,
  canUpdateStartup: true,
  canReadDatabases: true,
  canCreateDatabases: true,
  canDeleteDatabases: true,
  canViewDatabasePassword: true,
  canManageSubusers: true,
  canUpdateSettings: true,
  canReinstall: true,
  canReadBackups: true,
  canCreateBackups: true,
  canDeleteBackups: true,
  canReadSchedules: true,
  canManageSchedules: true,
  canReadAllocations: true,
  canCreateAllocations: true,
  canUpdateAllocations: true,
  canDeleteAllocations: true,
  canInstallMarketplace: true,
};

export function getServerAccess(server: ServerDetail): ServerAccessFlags {
  return server.access ?? FULL_ACCESS;
}

/** Map admin server detail into the client shape for shared console UI. */
export function adminServerToClientDetail(detail: AdminServerDetail): ServerDetail {
  return {
    id: detail.id,
    uuid: detail.uuid,
    uuidShort: detail.uuidShort,
    name: detail.name,
    description: detail.description ?? undefined,
    status: detail.status,
    suspended: detail.suspended,
    installStatus: detail.installStatus,
    containerState: detail.containerState ?? undefined,
    memory: detail.memory,
    disk: detail.disk,
    cpu: detail.cpu,
    startup: detail.startup,
    egg: { name: detail.egg.name, logoUrl: detail.egg.logoUrl },
    node: { name: detail.node.name, fqdn: detail.node.fqdn },
    defaultAllocation: detail.defaultAllocation,
    variables: [],
    access: { ...FULL_ACCESS, isOwner: false, isAdminSupport: true },
  };
}

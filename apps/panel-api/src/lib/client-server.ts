import type { FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';
import { logActivity } from '../services/activity.js';

export function requestIp(request: FastifyRequest): string {
  return request.ip ?? 'unknown';
}

export async function getOwnedServer(id: string, userId: string) {
  return prisma.server.findFirst({ where: { id, ownerId: userId } });
}

/** Owner-only actions, also allowed for panel admins in support mode. */
export async function getServerForOwnerActions(serverId: string, userId: string) {
  const access = await getServerAccess(serverId, userId);
  if (!access) return null;
  if (!access.isOwner && !access.isAdminSupport) return null;
  return access.server;
}

export function isPanelAdmin(user: { role: string; rootAdmin: boolean }): boolean {
  return user.role === 'admin' || user.rootAdmin;
}

export async function getServerAccess(serverId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, rootAdmin: true },
  });
  if (!user) return null;

  if (isPanelAdmin(user)) {
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return null;
    return { server, isOwner: false, permissions: ['*'] as string[], isAdminSupport: true as const };
  }

  const server = await prisma.server.findFirst({
    where: {
      id: serverId,
      OR: [{ ownerId: userId }, { subusers: { some: { userId } } }],
    },
    include: { subusers: { where: { userId }, select: { permissions: true } } },
  });
  if (!server) return null;

  const isOwner = server.ownerId === userId;
  const permissions = isOwner
    ? ['*']
    : ((server.subusers[0]?.permissions as string[] | undefined) ?? []);

  return { server, isOwner, permissions, isAdminSupport: false as const };
}

export function hasClientPermission(permissions: string[], permission: string) {
  return permissions.includes('*') || permissions.includes(permission);
}

/** Permissions embedded in Wings websocket JWTs for client sessions. */
export const WINGS_CLIENT_PERMISSIONS = [
  'control.console',
  'control.start',
  'control.stop',
  'control.restart',
  'file.read',
  'file.create',
  'file.update',
  'file.delete',
  'file.archive',
  'file.sftp',
  'websocket.connect',
  'startup.read',
  'startup.update',
  'database.read',
  'database.create',
  'database.delete',
  'database.view_password',
  'backup.read',
  'backup.create',
  'backup.delete',
  'schedule.read',
  'schedule.create',
  'schedule.update',
  'schedule.delete',
  'admin.websocket.install',
  'allocation.read',
  'allocation.create',
  'allocation.update',
  'allocation.delete',
  'marketplace.install',
] as const;

export const POWER_ACTION_PERMISSION: Record<string, string> = {
  start: 'control.start',
  stop: 'control.stop',
  restart: 'control.restart',
  kill: 'control.stop',
};

export function buildServerAccessFlags(
  isOwner: boolean,
  permissions: string[],
  isAdminSupport = false,
) {
  const elevated = isOwner || isAdminSupport;
  const can = (p: string) => elevated || hasClientPermission(permissions, p);
  return {
    isOwner,
    isAdminSupport,
    permissions: elevated ? (['*'] as string[]) : permissions,
    canConsole: can('control.console'),
    canStart: can('control.start'),
    canStop: can('control.stop'),
    canRestart: can('control.restart'),
    canReadFiles: can('file.read'),
    canWriteFiles: can('file.update'),
    canCreateFiles: can('file.create'),
    canDeleteFiles: can('file.delete'),
    canReadStartup: can('startup.read') || can('startup.update'),
    canUpdateStartup: can('startup.update'),
    canReadDatabases: can('database.read'),
    canCreateDatabases: can('database.create'),
    canDeleteDatabases: can('database.delete'),
    canViewDatabasePassword: can('database.view_password'),
    canManageSubusers: elevated,
    canUpdateSettings: elevated,
    canReinstall: elevated,
    canReadBackups: can('backup.read'),
    canCreateBackups: can('backup.create'),
    canDeleteBackups: can('backup.delete'),
    canReadSchedules: can('schedule.read'),
    canManageSchedules:
      can('schedule.create') || can('schedule.update') || can('schedule.delete'),
    canReadAllocations: can('allocation.read'),
    canCreateAllocations: can('allocation.create'),
    canUpdateAllocations: can('allocation.update'),
    canDeleteAllocations: can('allocation.delete'),
    canInstallMarketplace: can('marketplace.install'),
  };
}

export function wingsPermissionsForUser(isOwner: boolean, permissions: string[], all: string[]) {
  if (isOwner) return all;
  return all.filter((p) => hasClientPermission(permissions, p));
}

export async function logServerActivity(
  request: FastifyRequest,
  input: {
    serverId: string;
    event: string;
    description: string;
    properties?: Record<string, unknown>;
  },
) {
  await logActivity({
    event: input.event,
    actorId: request.user!.id,
    serverId: input.serverId,
    ip: requestIp(request),
    description: input.description,
    properties: input.properties,
  });
}

import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  BarChart3,
  CalendarClock,
  Database,
  FolderOpen,
  History,
  Network,
  Package,
  Settings,
  Settings2,
  Store,
  Terminal,
  Users,
} from 'lucide-react';
import type { AdminServerDetail, UpdateAdminServerInput } from '../../../lib/api';
import { isServerEffectivelyRunning, isServerInstalling } from '../../../lib/server-runtime';

export type ServerDetailTab = 'overview' | 'manage' | 'network' | 'activity';

const TABS: ServerDetailTab[] = ['overview', 'manage', 'network', 'activity'];

export function readServerDetailTab(value: string | null): ServerDetailTab {
  if (value === 'manage' || value === 'network' || value === 'activity') return value;
  return 'overview';
}

export type ServerDetailTone = 'running' | 'offline' | 'installing' | 'suspended';

export function getServerDetailTone(detail: AdminServerDetail): ServerDetailTone {
  if (detail.suspended) return 'suspended';
  if (isServerInstalling(detail)) return 'installing';
  if (isServerEffectivelyRunning(detail)) return 'running';
  return 'offline';
}

export function formFromServerDetail(detail: AdminServerDetail): UpdateAdminServerInput {
  return {
    ownerId: detail.owner.id,
    name: detail.name,
    description: detail.description ?? '',
    memory: detail.memory,
    swap: detail.swap,
    disk: detail.disk,
    io: detail.io,
    cpu: detail.cpu,
    allocationLimit: detail.allocationLimit ?? 0,
    backupLimit: detail.backupLimit ?? 0,
    databaseLimit: detail.databaseLimit ?? 0,
    suspended: detail.suspended,
  };
}

export function serverFormHasChanges(
  detail: AdminServerDetail,
  form: UpdateAdminServerInput,
  fullAdmin: boolean,
): boolean {
  if (!fullAdmin) {
    return (form.suspended ?? false) !== detail.suspended;
  }
  return (
    form.ownerId !== detail.owner.id ||
    form.name !== detail.name ||
    (form.description ?? '') !== (detail.description ?? '') ||
    form.memory !== detail.memory ||
    form.swap !== detail.swap ||
    form.disk !== detail.disk ||
    form.io !== detail.io ||
    form.cpu !== detail.cpu ||
    (form.allocationLimit ?? 0) !== (detail.allocationLimit ?? 0) ||
    (form.backupLimit ?? 0) !== (detail.backupLimit ?? 0) ||
    (form.databaseLimit ?? 0) !== (detail.databaseLimit ?? 0) ||
    (form.suspended ?? false) !== detail.suspended
  );
}

export interface ServerSupportTool {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function getServerSupportTools(eggName: string): ServerSupportTool[] {
  const tools: ServerSupportTool[] = [
    { to: 'console', label: 'Console', icon: Terminal },
    { to: 'files', label: 'Files', icon: FolderOpen },
    { to: 'analytics', label: 'Analytics', icon: BarChart3 },
    { to: 'startup', label: 'Startup', icon: Settings2 },
    { to: 'settings', label: 'Settings', icon: Settings },
    { to: 'backups', label: 'Backups', icon: Archive },
    { to: 'databases', label: 'Databases', icon: Database },
    { to: 'schedules', label: 'Schedules', icon: CalendarClock },
    { to: 'network', label: 'Network', icon: Network },
    { to: 'users', label: 'Subusers', icon: Users },
    { to: 'activity', label: 'Activity', icon: History },
  ];

  if (eggName.toLowerCase().includes('fivem')) {
    tools.push({ to: 'marketplace', label: 'Marketplace', icon: Store });
  }

  if (
    /\b(minecraft|paper|spigot|purpur|folia|fabric|forge|neoforge|quilt|velocity|bungee)\b/i.test(
      eggName,
    )
  ) {
    tools.push({ to: 'plugins', label: 'Plugins', icon: Package });
  }

  return tools;
}

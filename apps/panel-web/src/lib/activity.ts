import {
  Archive,
  CalendarClock,
  Database,
  Download,
  Egg,
  FilePen,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  LogIn,
  MapPin,
  Network,
  Package,
  Play,
  RotateCw,
  Server,
  Settings,
  Shield,
  Skull,
  Square,
  Terminal,
  Trash2,
  Upload,
  UserMinus,
  UserPlus,
  Users,
  Variable,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const EVENT_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  // Auth
  'auth.login': { label: 'User login', icon: LogIn, color: 'text-green-400 bg-green-500/15' },
  'auth.discord.linked': { label: 'Discord linked', icon: UserPlus, color: 'text-indigo-400 bg-indigo-500/15' },
  'auth.discord.unlinked': { label: 'Discord unlinked', icon: UserMinus, color: 'text-amber-400 bg-amber-500/15' },
  'auth.register': { label: 'New signup', icon: UserPlus, color: 'text-blue-400 bg-blue-500/15' },
  'auth.profile.updated': { label: 'Profile updated', icon: Settings, color: 'text-indigo-400 bg-indigo-500/15' },

  // Admin — users
  'admin.user.created': { label: 'User created', icon: UserPlus, color: 'text-green-400 bg-green-500/15' },
  'admin.user.updated': { label: 'User updated', icon: Users, color: 'text-blue-400 bg-blue-500/15' },
  'admin.user.suspended': { label: 'User suspended', icon: Shield, color: 'text-yellow-400 bg-yellow-500/15' },
  'admin.user.unsuspended': { label: 'User unsuspended', icon: Shield, color: 'text-green-400 bg-green-500/15' },
  'admin.user.deleted': { label: 'User deleted', icon: UserMinus, color: 'text-red-400 bg-red-500/15' },

  // Admin — servers
  'admin.server.created': { label: 'Server provisioned', icon: Server, color: 'text-green-400 bg-green-500/15' },
  'admin.server.updated': { label: 'Server updated', icon: Settings, color: 'text-indigo-400 bg-indigo-500/15' },
  'admin.server.deleted': { label: 'Server deleted', icon: Server, color: 'text-red-400 bg-red-500/15' },
  'admin.server.suspended': { label: 'Server suspended', icon: Shield, color: 'text-yellow-400 bg-yellow-500/15' },
  'admin.server.unsuspended': { label: 'Server unsuspended', icon: Shield, color: 'text-green-400 bg-green-500/15' },
  'server.reinstall': { label: 'Server reinstall', icon: RotateCw, color: 'text-purple-400 bg-purple-500/15' },
  'admin.server.reinstall': { label: 'Server reinstall', icon: RotateCw, color: 'text-purple-400 bg-purple-500/15' },
  'admin.server.console': { label: 'Admin console opened', icon: Terminal, color: 'text-amber-400 bg-amber-500/15' },
  'admin.server.command': { label: 'Admin console command', icon: Terminal, color: 'text-amber-400 bg-amber-500/15' },

  // Admin — nodes & infra
  'admin.node.created': { label: 'Node created', icon: HardDrive, color: 'text-green-400 bg-green-500/15' },
  'admin.node.updated': { label: 'Node updated', icon: HardDrive, color: 'text-blue-400 bg-blue-500/15' },
  'admin.node.deleted': { label: 'Node deleted', icon: HardDrive, color: 'text-red-400 bg-red-500/15' },
  'admin.node.token_rotated': { label: 'Node token rotated', icon: Shield, color: 'text-amber-400 bg-amber-500/15' },
  'admin.node.config_downloaded': { label: 'Wings config downloaded', icon: Download, color: 'text-sky-400 bg-sky-500/15' },
  'admin.allocation.bulk_deleted': { label: 'Allocations removed', icon: Network, color: 'text-orange-400 bg-orange-500/15' },
  'admin.allocation.updated': { label: 'Allocation updated', icon: Network, color: 'text-blue-400 bg-blue-500/15' },
  'admin.location.created': { label: 'Location created', icon: MapPin, color: 'text-green-400 bg-green-500/15' },
  'admin.location.updated': { label: 'Location updated', icon: MapPin, color: 'text-blue-400 bg-blue-500/15' },
  'admin.location.deleted': { label: 'Location deleted', icon: MapPin, color: 'text-red-400 bg-red-500/15' },
  'admin.allocation.created': { label: 'Allocations added', icon: Network, color: 'text-cyan-400 bg-cyan-500/15' },
  'admin.allocation.deleted': { label: 'Allocation removed', icon: Network, color: 'text-orange-400 bg-orange-500/15' },
  'server.allocation.created': { label: 'Port assigned', icon: Network, color: 'text-cyan-400 bg-cyan-500/15' },
  'server.allocation.primary': { label: 'Primary port changed', icon: Network, color: 'text-indigo-400 bg-indigo-500/15' },
  'server.allocation.deleted': { label: 'Port removed', icon: Network, color: 'text-orange-400 bg-orange-500/15' },

  // Admin — config
  'admin.nest.created': { label: 'Nest created', icon: Egg, color: 'text-green-400 bg-green-500/15' },
  'admin.egg.imported': { label: 'Egg imported', icon: Egg, color: 'text-purple-400 bg-purple-500/15' },
  'admin.settings.updated': { label: 'Settings changed', icon: Settings, color: 'text-indigo-400 bg-indigo-500/15' },

  // Client server actions (per-server activity tab)
  'server.power.start': { label: 'Server started', icon: Play, color: 'text-green-400 bg-green-500/15' },
  'server.power.stop': { label: 'Server stopped', icon: Square, color: 'text-red-400 bg-red-500/15' },
  'server.power.restart': { label: 'Server restarted', icon: RotateCw, color: 'text-blue-400 bg-blue-500/15' },
  'server.power.kill': { label: 'Server killed', icon: Square, color: 'text-red-400 bg-red-500/15' },
  'server:crashed': { label: 'Server crashed', icon: Skull, color: 'text-red-400 bg-red-500/15' },
  'server.command': { label: 'Console command', icon: Terminal, color: 'text-purple-400 bg-purple-500/15' },
  'server.file.write': { label: 'File edited', icon: FilePen, color: 'text-amber-400 bg-amber-500/15' },
  'server.file.delete': { label: 'Files deleted', icon: Trash2, color: 'text-red-400 bg-red-500/15' },
  'server.file.mkdir': { label: 'Folder created', icon: FolderPlus, color: 'text-cyan-400 bg-cyan-500/15' },
  'server.file.rename': { label: 'File renamed', icon: FilePen, color: 'text-amber-400 bg-amber-500/15' },
  'server.file.move': { label: 'File moved', icon: FilePen, color: 'text-amber-400 bg-amber-500/15' },
  'server.file.copy': { label: 'File copied', icon: FilePen, color: 'text-blue-400 bg-blue-500/15' },
  'server.file.compress': { label: 'Archive created', icon: Archive, color: 'text-purple-400 bg-purple-500/15' },
  'server.file.decompress': { label: 'Archive extracted', icon: Archive, color: 'text-purple-400 bg-purple-500/15' },
  'server.file.download': { label: 'File downloaded', icon: Download, color: 'text-sky-400 bg-sky-500/15' },
  'server.file.upload': { label: 'File uploaded', icon: Upload, color: 'text-sky-400 bg-sky-500/15' },
  'server.settings.updated': { label: 'Settings changed', icon: Settings, color: 'text-indigo-400 bg-indigo-500/15' },
  'server.activity.cleared': { label: 'Activity cleared', icon: Trash2, color: 'text-orange-400 bg-orange-500/15' },
  'admin.activity.cleared': { label: 'Activity cleared', icon: Trash2, color: 'text-orange-400 bg-orange-500/15' },
  'admin.server.activity.cleared': { label: 'Server activity cleared', icon: Trash2, color: 'text-orange-400 bg-orange-500/15' },
  'server.variables.updated': { label: 'Startup updated', icon: Variable, color: 'text-cyan-400 bg-cyan-500/15' },
  'server.startup.updated': { label: 'Startup command updated', icon: Terminal, color: 'text-cyan-400 bg-cyan-500/15' },
  'server.subuser.added': { label: 'Subuser added', icon: UserPlus, color: 'text-green-400 bg-green-500/15' },
  'server.subuser.removed': { label: 'Subuser removed', icon: UserMinus, color: 'text-orange-400 bg-orange-500/15' },
  'server.subuser.updated': { label: 'Subuser updated', icon: Users, color: 'text-blue-400 bg-blue-500/15' },
  'server.database.created': { label: 'Database created', icon: Database, color: 'text-green-400 bg-green-500/15' },
  'server.database.deleted': { label: 'Database deleted', icon: Database, color: 'text-red-400 bg-red-500/15' },
  'server.backup.created': { label: 'Backup started', icon: Archive, color: 'text-purple-400 bg-purple-500/15' },
  'server.backup.download': { label: 'Backup downloaded', icon: Download, color: 'text-purple-400 bg-purple-500/15' },
  'server.backup.restore': { label: 'Backup restored', icon: RotateCw, color: 'text-violet-400 bg-violet-500/15' },
  'server.backup.deleted': { label: 'Backup deleted', icon: Trash2, color: 'text-orange-400 bg-orange-500/15' },
  'server.schedule.created': { label: 'Schedule created', icon: CalendarClock, color: 'text-green-400 bg-green-500/15' },
  'server.schedule.executed': { label: 'Schedule ran', icon: CalendarClock, color: 'text-violet-400 bg-violet-500/15' },
  'server.schedule.deleted': { label: 'Schedule deleted', icon: CalendarClock, color: 'text-red-400 bg-red-500/15' },
  'server.marketplace.install': { label: 'Script installed', icon: Package, color: 'text-emerald-400 bg-emerald-500/15' },
  'server.marketplace.uninstall': { label: 'Script removed', icon: Package, color: 'text-orange-400 bg-orange-500/15' },
  'server.marketplace.update': { label: 'Script updated', icon: Package, color: 'text-blue-400 bg-blue-500/15' },
  'server.marketplace.github.install': { label: 'GitHub script installed', icon: Package, color: 'text-emerald-400 bg-emerald-500/15' },
  'server.marketplace.github.uninstall': { label: 'GitHub script removed', icon: Package, color: 'text-orange-400 bg-orange-500/15' },
  'server.marketplace.github.update': { label: 'GitHub script updated', icon: Package, color: 'text-blue-400 bg-blue-500/15' },
  'server.plugins.modrinth.install': { label: 'Plugin installed', icon: Package, color: 'text-emerald-400 bg-emerald-500/15' },
  'server.plugins.modrinth.uninstall': { label: 'Plugin removed', icon: Package, color: 'text-orange-400 bg-orange-500/15' },
  'server.plugins.modrinth.update': { label: 'Plugin updated', icon: Package, color: 'text-blue-400 bg-blue-500/15' },
};

const DEFAULT_META = { label: 'Activity', icon: Settings, color: 'text-[var(--muted)] bg-[var(--surface-hover)]' };

export function getActivityMeta(event: string) {
  if (EVENT_META[event]) return EVENT_META[event];
  if (event.startsWith('admin.server.power.')) {
    const action = event.split('.').pop();
    const powerKey = `server.power.${action}` as keyof typeof EVENT_META;
    if (EVENT_META[powerKey]) return { ...EVENT_META[powerKey], label: `Admin ${action}` };
  }
  if (event.startsWith('server.power.')) {
    const action = event.split('.').pop();
    return EVENT_META[`server.power.${action}`] ?? DEFAULT_META;
  }
  if (event.startsWith('auth.')) {
    return { ...DEFAULT_META, label: event.replace('auth.', '').replace(/\./g, ' '), icon: LogIn };
  }
  if (event.startsWith('admin.')) {
    return { ...DEFAULT_META, label: event.replace('admin.', '').replace(/\./g, ' ') };
  }
  return { ...DEFAULT_META, label: event.replace(/\./g, ' ').replace(/^\w/, (c) => c.toUpperCase()) };
}

export function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleString();
}

export type ActivityFilterCategory =
  | 'all'
  | 'power'
  | 'files'
  | 'settings'
  | 'access'
  | 'backups'
  | 'automation'
  | 'network'
  | 'marketplace';

export interface ActivityFilterMeta {
  id: ActivityFilterCategory;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  chipClass: string;
}

export const ACTIVITY_FILTER_OPTIONS: ActivityFilterMeta[] = [
  { id: 'all', label: 'All events', shortLabel: 'All', icon: LayoutGrid, chipClass: 'activity-filter-chip--all' },
  { id: 'power', label: 'Power & console', shortLabel: 'Power', icon: Play, chipClass: 'activity-filter-chip--power' },
  { id: 'files', label: 'File manager', shortLabel: 'Files', icon: FilePen, chipClass: 'activity-filter-chip--files' },
  { id: 'settings', label: 'Settings & startup', shortLabel: 'Settings', icon: Settings, chipClass: 'activity-filter-chip--settings' },
  { id: 'access', label: 'Subusers', shortLabel: 'Access', icon: Users, chipClass: 'activity-filter-chip--access' },
  { id: 'backups', label: 'Backups & databases', shortLabel: 'Data', icon: Database, chipClass: 'activity-filter-chip--backups' },
  { id: 'automation', label: 'Schedules', shortLabel: 'Schedules', icon: CalendarClock, chipClass: 'activity-filter-chip--automation' },
  { id: 'network', label: 'Network ports', shortLabel: 'Network', icon: Network, chipClass: 'activity-filter-chip--network' },
  { id: 'marketplace', label: 'Marketplace & plugins', shortLabel: 'Store', icon: Package, chipClass: 'activity-filter-chip--marketplace' },
];

const FILTER_PREFIXES: Record<Exclude<ActivityFilterCategory, 'all'>, string[]> = {
  power: ['server.power.', 'server.command'],
  files: ['server.file.'],
  settings: ['server.settings.', 'server.variables.', 'server.startup.', 'server.reinstall'],
  access: ['server.subuser.'],
  backups: ['server.database.', 'server.backup.'],
  automation: ['server.schedule.'],
  network: ['server.allocation.'],
  marketplace: ['server.marketplace.', 'server.plugins.'],
};

export function getActivityFilterMeta(category: ActivityFilterCategory): ActivityFilterMeta {
  return ACTIVITY_FILTER_OPTIONS.find((option) => option.id === category) ?? ACTIVITY_FILTER_OPTIONS[0];
}

export function getActivityFilterCategory(event: string): ActivityFilterCategory {
  for (const [category, prefixes] of Object.entries(FILTER_PREFIXES) as [
    Exclude<ActivityFilterCategory, 'all'>,
    string[],
  ][]) {
    if (prefixes.some((p) => event.startsWith(p))) return category;
  }
  return 'all';
}

export function matchesActivityFilter(event: string, filter: ActivityFilterCategory): boolean {
  if (filter === 'all') return true;
  return getActivityFilterCategory(event) === filter;
}

export function formatActivityDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function groupActivityByDate(entries: ActivityEntry[]): Array<{ label: string; entries: ActivityEntry[] }> {
  const groups = new Map<string, ActivityEntry[]>();
  for (const entry of entries) {
    const label = formatActivityDateGroup(entry.timestamp);
    const list = groups.get(label) ?? [];
    list.push(entry);
    groups.set(label, list);
  }
  return Array.from(groups.entries()).map(([label, groupEntries]) => ({ label, entries: groupEntries }));
}

export interface ActivityEntry {
  id: string;
  event: string;
  description: string | null;
  ip: string | null;
  timestamp: string;
  actor: { username: string; email: string; role?: string } | null;
  server?: { id: string; name: string } | null;
  properties?: Record<string, unknown> | null;
}

/** Paginated activity feed page (shared by server / user / panel feeds). */
export interface ActivityPageResult {
  items: ActivityEntry[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export function getActivityCategory(event: string): 'auth' | 'admin' | 'server' {
  if (event.startsWith('auth.')) return 'auth';
  if (event.startsWith('admin.')) return 'admin';
  return 'server';
}

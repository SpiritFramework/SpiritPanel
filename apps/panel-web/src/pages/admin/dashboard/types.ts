import type { NodeCapacityStats } from '../../../lib/api';

export interface DashboardStats {
  users: number;
  servers: number;
  suspended: number;
  installing: number;
  nodes: number;
  nodesOnline: number;
  nests: number;
  allocationsTotal: number;
  allocationsUsed: number;
}

export interface DashboardNodeHealth {
  id: string;
  name: string;
  fqdn: string;
  location: string;
  online: boolean;
  version: string | null;
  maintenanceMode: boolean;
  memory: number;
  disk: number;
  serverCount: number;
  allocationCount: number;
  capacity?: NodeCapacityStats;
}

export interface DashboardRecentServer {
  id: string;
  name: string;
  status: string;
  suspended: boolean;
  installStatus?: string;
  containerState?: string | null;
  createdAt: string;
  owner: { username: string };
  node: { name: string; fqdn?: string };
  egg: { name: string; logoUrl?: string | null };
  defaultAllocation: { ip: string; port: number; alias?: string | null };
}

export interface DashboardActivityItem {
  id: string;
  event: string;
  description: string;
  timestamp: string;
  actor?: { username: string } | null;
  server?: { id: string; name: string } | null;
}

export interface DashboardData {
  stats: DashboardStats;
  nodeHealth: DashboardNodeHealth[];
  recentServers: DashboardRecentServer[];
  recentActivity: DashboardActivityItem[];
}

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  users: 0,
  servers: 0,
  suspended: 0,
  installing: 0,
  nodes: 0,
  nodesOnline: 0,
  nests: 0,
  allocationsTotal: 0,
  allocationsUsed: 0,
};

export function greetingForHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function fleetHealthScore(stats: DashboardStats): number {
  if (stats.nodes === 0) return 100;
  const nodeScore = (stats.nodesOnline / stats.nodes) * 55;
  const suspendPenalty = stats.servers > 0 ? (stats.suspended / stats.servers) * 20 : 0;
  const offlinePenalty = ((stats.nodes - stats.nodesOnline) / stats.nodes) * 25;
  return Math.max(0, Math.round(100 - suspendPenalty - offlinePenalty + nodeScore - 55));
}

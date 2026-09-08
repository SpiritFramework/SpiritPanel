import type { ServerDomainInfo } from '../../../lib/api';

export type DomainRow = ServerDomainInfo & {
  server: {
    id: string;
    name: string;
    owner: { id: string; username: string; email: string };
    node: { id: string; name: string; domainBase: string | null };
  };
};

export type DomainFleetFilter = 'all' | 'prefer_subdomain' | 'prefer_ip' | 'error';

export type DomainFleetStats = {
  total: number;
  preferSubdomain: number;
  preferIp: number;
  errors: number;
  nodes: number;
  owners: number;
};

export function computeDomainFleetStats(rows: DomainRow[]): DomainFleetStats {
  const nodeIds = new Set<string>();
  const ownerIds = new Set<string>();
  let preferSubdomain = 0;
  let preferIp = 0;
  let errors = 0;

  for (const row of rows) {
    nodeIds.add(row.server.node.id);
    ownerIds.add(row.server.owner.id);
    if (row.preferSubdomain) preferSubdomain++;
    else preferIp++;
    if (row.status === 'error') errors++;
  }

  return {
    total: rows.length,
    preferSubdomain,
    preferIp,
    errors,
    nodes: nodeIds.size,
    owners: ownerIds.size,
  };
}

export function matchesDomainFilter(row: DomainRow, filter: DomainFleetFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'prefer_subdomain':
      return row.preferSubdomain;
    case 'prefer_ip':
      return !row.preferSubdomain;
    case 'error':
      return row.status === 'error';
    default:
      return true;
  }
}

export function matchesDomainSearch(row: DomainRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    row.fqdn.toLowerCase().includes(q) ||
    row.slug.toLowerCase().includes(q) ||
    row.targetIp.toLowerCase().includes(q) ||
    row.server.name.toLowerCase().includes(q) ||
    row.server.owner.username.toLowerCase().includes(q) ||
    row.server.owner.email.toLowerCase().includes(q) ||
    row.server.node.name.toLowerCase().includes(q) ||
    (row.server.node.domainBase?.toLowerCase().includes(q) ?? false)
  );
}

export type NodeDomainCount = {
  nodeId: string;
  nodeName: string;
  domainBase: string | null;
  count: number;
};

export function groupDomainsByNode(rows: DomainRow[]): NodeDomainCount[] {
  const map = new Map<string, NodeDomainCount>();
  for (const row of rows) {
    const existing = map.get(row.server.node.id);
    if (existing) {
      existing.count++;
    } else {
      map.set(row.server.node.id, {
        nodeId: row.server.node.id,
        nodeName: row.server.node.name,
        domainBase: row.server.node.domainBase,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

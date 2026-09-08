import type { Node } from '@prisma/client';
import { wingsForNode } from '../services/wings-client.js';
import { prisma } from './prisma.js';

export interface NodeHealthProbe {
  online: boolean;
  wingsVersion: string | null;
  error: string | null;
}

export async function probeNodeHealth(node: Node): Promise<NodeHealthProbe> {
  try {
    const sys = await wingsForNode(node).getSystem();
    return {
      online: true,
      wingsVersion: typeof sys.version === 'string' ? sys.version : null,
      error: null,
    };
  } catch (e) {
    return {
      online: false,
      wingsVersion: null,
      error: e instanceof Error ? e.message : 'FeatherWings unreachable',
    };
  }
}

export function sanitizeAdminNode<T extends { daemonTokenSecret?: string }>(node: T) {
  const { daemonTokenSecret: _secret, ...safe } = node;
  return safe;
}

/** Strip daemon credentials from node payloads returned to clients. */
export function sanitizeClientNode<T extends { daemonTokenId?: string; daemonTokenSecret?: string }>(node: T) {
  const { daemonTokenId: _id, daemonTokenSecret: _secret, ...safe } = node;
  return safe;
}

export function stripServerNodeSecrets<T extends { node?: { daemonTokenId?: string; daemonTokenSecret?: string } }>(
  server: T,
): T {
  if (!server.node) return server;
  return { ...server, node: sanitizeClientNode(server.node) };
}

/** Probe reachability for a set of node IDs (one Wings call per node). */
export async function probeNodesReachability(
  nodeIds: string[],
): Promise<Map<string, NodeHealthProbe>> {
  const unique = [...new Set(nodeIds)];
  if (unique.length === 0) return new Map();

  const nodes = await prisma.node.findMany({ where: { id: { in: unique } } });
  const results = new Map<string, NodeHealthProbe>();

  await Promise.all(
    nodes.map(async (node) => {
      results.set(node.id, await probeNodeHealth(node));
    }),
  );

  for (const id of unique) {
    if (!results.has(id)) {
      results.set(id, { online: false, wingsVersion: null, error: 'Node not found' });
    }
  }

  return results;
}

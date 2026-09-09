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

export function sanitizeAdminNode<T extends { daemonTokenSecret?: string; daemonTokenId?: string }>(
  node: T,
) {
  const { daemonTokenSecret: _secret, daemonTokenId: _id, ...safe } = node;
  return safe;
}

/** Strip daemon credentials from node payloads returned to clients. */
export function sanitizeClientNode<T extends { daemonTokenId?: string; daemonTokenSecret?: string }>(
  node: T,
) {
  const { daemonTokenId: _id, daemonTokenSecret: _secret, ...safe } = node;
  return safe;
}

export function stripServerNodeSecrets<T extends { node?: { daemonTokenId?: string; daemonTokenSecret?: string } }>(
  server: T,
): T {
  if (!server.node) return server;
  return { ...server, node: sanitizeClientNode(server.node) };
}

/** Public user fields safe for Application API / nested owner embeds. */
export const PUBLIC_USER_SELECT = {
  id: true,
  uuid: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  enabled: true,
  role: true,
  rootAdmin: true,
  createdAt: true,
} as const;

export type PublicUser = {
  id: string;
  uuid: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  enabled: boolean;
  role: string;
  rootAdmin: boolean;
  createdAt: Date;
};

/** Strip password hashes, TOTP, PATs, and other secrets from a User-like object. */
export function sanitizePublicUser<T extends Record<string, unknown>>(user: T): PublicUser {
  return {
    id: String(user.id ?? ''),
    uuid: String(user.uuid ?? ''),
    email: String(user.email ?? ''),
    username: String(user.username ?? ''),
    firstName: (user.firstName as string | null | undefined) ?? null,
    lastName: (user.lastName as string | null | undefined) ?? null,
    avatarUrl: (user.avatarUrl as string | null | undefined) ?? null,
    enabled: Boolean(user.enabled),
    role: String(user.role ?? 'user'),
    rootAdmin: Boolean(user.rootAdmin),
    createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(String(user.createdAt ?? Date.now())),
  };
}

/**
 * Application / HTTP JSON serializer for servers: strip Wings daemon tokens
 * and sanitize nested owner if present.
 */
export function serializeApplicationServer<
  T extends {
    node?: { daemonTokenId?: string; daemonTokenSecret?: string };
    owner?: Record<string, unknown>;
  },
>(server: T) {
  const withSafeNode = stripServerNodeSecrets(server);
  if (!withSafeNode.owner) return withSafeNode;
  return { ...withSafeNode, owner: sanitizePublicUser(withSafeNode.owner) };
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

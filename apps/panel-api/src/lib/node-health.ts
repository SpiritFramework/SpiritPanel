import type { Node } from '@prisma/client';
import { wingsForNode } from '../services/wings-client.js';
import { prisma } from './prisma.js';

export interface NodeHealthProbe {
  online: boolean;
  wingsVersion: string | null;
  error: string | null;
  /** Continuous reachability window while the node stays online (incl. grace). */
  uptimeMs: number | null;
}

/** One slow `GET /api/system` must not flip the node offline. Server list, admin
 * servers, and the health worker all probe about every 15s with a 10s timeout.
 * A single miss was marking the node offline, the next success marked it online
 * and re-polled every server, and that load made the following probe miss again. */
const ONLINE_GRACE_MS = 45_000;

type RecentOnline = { at: number; wingsVersion: string | null; since: number };
const recentOnline = new Map<string, RecentOnline>();

export async function probeNodeHealth(node: Node): Promise<NodeHealthProbe> {
  try {
    const sys = await wingsForNode(node).getSystem();
    const wingsVersion = typeof sys.version === 'string' ? sys.version : null;
    const now = Date.now();
    const existing = recentOnline.get(node.id);
    const since = existing?.since ?? now;
    recentOnline.set(node.id, { at: now, wingsVersion, since });
    return { online: true, wingsVersion, error: null, uptimeMs: now - since };
  } catch (e) {
    const recent = recentOnline.get(node.id);
    if (recent && Date.now() - recent.at < ONLINE_GRACE_MS) {
      return {
        online: true,
        wingsVersion: recent.wingsVersion,
        error: null,
        uptimeMs: Date.now() - recent.since,
      };
    }
    recentOnline.delete(node.id);
    return {
      online: false,
      wingsVersion: null,
      error: e instanceof Error ? e.message : 'FeatherWings unreachable',
      uptimeMs: null,
    };
  }
}

/** Strip Wings token secret from admin payloads. Token ID stays — admins need it in the UI. */
export function sanitizeAdminNode<T extends { daemonTokenSecret?: string }>(node: T) {
  const { daemonTokenSecret: _secret, ...safe } = node;
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
      results.set(id, { online: false, wingsVersion: null, error: 'Node not found', uptimeMs: null });
    }
  }

  return results;
}

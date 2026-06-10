import type { Node } from '@prisma/client';
import { wingsForNode } from '../services/wings-client.js';

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

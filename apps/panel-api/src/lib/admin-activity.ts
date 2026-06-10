import type { FastifyRequest } from 'fastify';
import { logActivity } from '../services/activity.js';
import { requestIp } from './client-server.js';

/** Events shown on the admin dashboard and activity log by default. */
export const PANEL_ACTIVITY_PREFIXES = ['auth.', 'admin.'] as const;

export function isPanelActivityEvent(event: string): boolean {
  return PANEL_ACTIVITY_PREFIXES.some((prefix) => event.startsWith(prefix));
}

export async function logAuthActivity(
  request: FastifyRequest,
  input: {
    event: string;
    actorId?: string | null;
    description: string;
    properties?: Record<string, unknown>;
  },
) {
  await logActivity({
    event: input.event,
    actorId: input.actorId ?? null,
    ip: requestIp(request),
    description: input.description,
    properties: input.properties,
  });
}

export async function logAdminActivity(
  request: FastifyRequest,
  input: {
    event: string;
    description: string;
    serverId?: string | null;
    nodeId?: string | null;
    properties?: Record<string, unknown>;
  },
) {
  await logActivity({
    event: input.event,
    actorId: request.user!.id,
    serverId: input.serverId ?? null,
    nodeId: input.nodeId ?? null,
    ip: requestIp(request),
    description: input.description,
    properties: input.properties,
  });
}

import { z } from 'zod';
import type { FastifyRequest } from 'fastify';

export const APPLICATION_SCOPES = [
  'users.read',
  'users.write',
  'servers.read',
  'servers.write',
  'servers.suspend',
  'servers.delete',
] as const;

export type ApplicationScope = (typeof APPLICATION_SCOPES)[number];

export const APPLICATION_SCOPE_ALL = 'application.*';

export const applicationScopeZod = z.enum([
  'users.read',
  'users.write',
  'servers.read',
  'servers.write',
  'servers.suspend',
  'servers.delete',
]);

export interface ApplicationApiKeyContext {
  id: string;
  identifier: string;
  permissions: string[] | null;
  allowedIps: string[] | null;
}

export function parseApplicationPermissions(raw: unknown): string[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  return raw.filter((v): v is string => typeof v === 'string');
}

export function parseAllowedIps(raw: unknown): string[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  return raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

export function normalizeApplicationPermissions(input?: string[] | null): string[] {
  if (!input || input.length === 0) {
    return [...APPLICATION_SCOPES];
  }
  const unique = [...new Set(input.map((s) => s.trim()).filter(Boolean))];
  if (unique.includes(APPLICATION_SCOPE_ALL)) {
    return [...APPLICATION_SCOPES];
  }
  const invalid = unique.filter(
    (s) => s !== APPLICATION_SCOPE_ALL && !APPLICATION_SCOPES.includes(s as ApplicationScope),
  );
  if (invalid.length > 0) {
    throw Object.assign(new Error(`Invalid application API scopes: ${invalid.join(', ')}`), {
      statusCode: 422,
    });
  }
  return unique as ApplicationScope[];
}

/** null permissions on legacy keys = full access until rotated. */
export function applicationKeyHasScope(key: ApplicationApiKeyContext, scope: ApplicationScope): boolean {
  if (key.permissions === null) return true;
  if (key.permissions.includes(APPLICATION_SCOPE_ALL)) return true;
  return key.permissions.includes(scope);
}

export function assertApplicationKeyIpAllowed(key: ApplicationApiKeyContext, request: FastifyRequest): void {
  const allowed = key.allowedIps;
  if (!allowed || allowed.length === 0) return;

  const clientIp = request.ip ?? '';
  const match = allowed.some((entry) => entry.trim() === clientIp);
  if (!match) {
    throw Object.assign(new Error('API key is not allowed from this IP address'), { statusCode: 403 });
  }
}

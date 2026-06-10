import type { FastifyReply, FastifyRequest } from 'fastify';
import { getConfig } from './env.js';

export const SESSION_COOKIE = 'spirit_session';

const USER_MAX_AGE_SEC = 7 * 24 * 60 * 60;
const ADMIN_MAX_AGE_SEC = 24 * 60 * 60;

function cookieMaxAge(role: string): number {
  return role === 'admin' ? ADMIN_MAX_AGE_SEC : USER_MAX_AGE_SEC;
}

export function setSessionCookie(reply: FastifyReply, token: string, role: string) {
  const config = getConfig();
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${cookieMaxAge(role)}`,
  ];
  if (config.isProduction) parts.push('Secure');
  reply.header('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(reply: FastifyReply) {
  const config = getConfig();
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (config.isProduction) parts.push('Secure');
  reply.header('Set-Cookie', parts.join('; '));
}

export function getSessionToken(request: FastifyRequest): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

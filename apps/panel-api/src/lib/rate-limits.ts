import type { FastifyRequest } from 'fastify';
import { getConfig } from './env.js';

const isProd = () => getConfig().isProduction;

export function clientIpKey(request: FastifyRequest): string {
  return request.ip ?? 'unknown';
}

export function userOrIpKey(request: FastifyRequest): string {
  return request.user?.id ? `user:${request.user.id}` : `ip:${clientIpKey(request)}`;
}

function loginBodyIdentifier(request: FastifyRequest): string {
  const body = request.body as { identifier?: string; email?: string } | undefined;
  const raw = (body?.identifier ?? body?.email ?? '').trim().toLowerCase();
  return raw || 'unknown';
}

export const GLOBAL_RATE_LIMIT = {
  max: isProd() ? 300 : 200,
  timeWindow: '1 minute' as const,
  keyGenerator: userOrIpKey,
};

export const AUTH_RATE_LIMIT = {
  rateLimit: {
    max: isProd() ? 12 : 40,
    timeWindow: '1 minute' as const,
    keyGenerator: (request: FastifyRequest) => `auth:${clientIpKey(request)}:${loginBodyIdentifier(request)}`,
  },
};

export const LOGIN_RATE_LIMIT = {
  rateLimit: {
    max: isProd() ? 8 : 25,
    timeWindow: '1 minute' as const,
    keyGenerator: (request: FastifyRequest) =>
      `login:${clientIpKey(request)}:${loginBodyIdentifier(request)}`,
  },
};

export const UPLOAD_RATE_LIMIT = {
  rateLimit: {
    max: isProd() ? 20 : 40,
    timeWindow: '1 minute' as const,
    keyGenerator: userOrIpKey,
  },
};

export const EXPENSIVE_ROUTE_RATE_LIMIT = {
  rateLimit: {
    max: isProd() ? 15 : 30,
    timeWindow: '1 minute' as const,
    keyGenerator: userOrIpKey,
  },
};

export const APPLICATION_RATE_LIMIT = {
  rateLimit: {
    max: isProd() ? 60 : 120,
    timeWindow: '1 minute' as const,
    keyGenerator: (request: FastifyRequest) => {
      const key = request.applicationApiKey?.identifier;
      return key ? `appkey:${key}` : `appip:${clientIpKey(request)}`;
    },
  },
};

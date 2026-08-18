import type { FastifyRequest } from 'fastify';
import { getConfig } from './env.js';

const isProd = () => getConfig().isProduction;

function isBootstrapAuthPath(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0];
  return path === '/api/auth/branding' || path === '/api/auth/me';
}

function isDaemonRemotePath(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0];
  return path === '/api/remote' || path.startsWith('/api/remote/');
}

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
  skipOnError: true,
  continueExceeding: false,
  // Wings boot + status + activity can exceed 300/min on busy nodes.
  allowList: (request: FastifyRequest) => isBootstrapAuthPath(request) || isDaemonRemotePath(request),
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

// Additional rate limits for specific operations
export const API_KEY_CREATION_LIMIT = {
  rateLimit: {
    max: isProd() ? 5 : 20, // 5 API keys per minute
    timeWindow: '1 minute' as const,
    keyGenerator: (request: FastifyRequest) => `apikeycreate:${userOrIpKey(request)}`,
  },
};

export const PASSWORD_RESET_LIMIT = {
  rateLimit: {
    max: isProd() ? 3 : 10, // 3 password resets per minute
    timeWindow: '15 minutes' as const,
    keyGenerator: (request: FastifyRequest) => `pwreset:${loginBodyIdentifier(request)}`,
  },
};

export const FILE_UPLOAD_RATE_LIMIT = {
  rateLimit: {
    max: isProd() ? 10 : 50, // 10 file uploads per minute
    timeWindow: '1 minute' as const,
    keyGenerator: userOrIpKey,
  },
};

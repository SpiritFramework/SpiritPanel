/**
 * API response optimization utilities
 */

import type { FastifyReply } from 'fastify';

interface ResponseWrapper<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    cached?: boolean;
    requestId?: string;
    timestamp?: number;
  };
}

/** Send optimized API response */
export function sendOptimized<T>(reply: FastifyReply, data: T, options: {
  status?: number;
  cached?: boolean;
  requestId?: string;
} = {}): FastifyReply {
  const { status = 200, cached = false, requestId } = options;

  const response: ResponseWrapper<T> = {
    success: status >= 200 && status < 300,
    data: status >= 200 && status < 300 ? data : undefined,
    meta: {
      cached,
      requestId,
      timestamp: Date.now(),
    },
  };

  // Set cache headers for GET requests with 200 status
  if (status === 200 && cached) {
    reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
    reply.header('ETag', generateETag(JSON.stringify(data)));
  } else if (status === 200) {
    reply.header('Cache-Control', 'private, no-cache');
  }

  return reply.status(status).send(response);
}

/** Send error response */
export function sendError(
  reply: FastifyReply,
  message: string,
  options: {
    status?: number;
    requestId?: string;
    code?: string;
  } = {}
): FastifyReply {
  const { status = 400, requestId, code } = options;

  const response: ResponseWrapper<null> = {
    success: false,
    error: message,
    meta: {
      requestId,
      timestamp: Date.now(),
    },
  };

  // Add error code if provided
  if (code) {
    (response as any).code = code;
  }

  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return reply.status(status).send(response);
}

/** Generate ETag for response caching */
function generateETag(content: string): string {
  const hash = require('crypto')
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .slice(0, 16);
  return `"${hash}"`;
}

/** Paginated response wrapper */
export function sendPaginated<T>(
  reply: FastifyReply,
  items: T[],
  options: {
    total: number;
    page: number;
    pageSize: number;
    status?: number;
    requestId?: string;
  }
): FastifyReply {
  const { total, page, pageSize, status = 200, requestId } = options;
  const totalPages = Math.ceil(total / pageSize);

  return reply.status(status).send({
    success: true,
    data: items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    meta: {
      requestId,
      timestamp: Date.now(),
    },
  });
}

/** Compress large response payloads */
export function shouldCompress(payload: any): boolean {
  const payloadStr = JSON.stringify(payload);
  // Compress if larger than 1KB
  return payloadStr.length > 1024;
}

/** Response size optimization hints */
export const OPTIMIZATION_HINTS = {
  USER: ['id', 'email', 'name', 'avatar', 'role', 'createdAt'],
  SERVER: ['id', 'name', 'status', 'memory', 'cpu', 'storage'],
  DATABASE: ['id', 'name', 'host', 'status', 'size', 'createdAt'],
  FILE: ['name', 'size', 'type', 'modified', 'path'],
} as const;

/** Get optimized fields for resource type */
export function getOptimizedFields(resourceType: keyof typeof OPTIMIZATION_HINTS): readonly string[] {
  return OPTIMIZATION_HINTS[resourceType];
}

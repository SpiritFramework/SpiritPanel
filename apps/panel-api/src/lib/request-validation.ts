import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Security and validation utilities for request handling
 */

const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 1000;
const SUSPICIOUS_PATTERNS = [
  /script[^>]*>/gi,
  /on\w+\s*=/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /<iframe/gi,
  /eval\(/gi,
  /expression\(/gi,
];

/** Sanitize a string value to prevent injection attacks */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';
  
  // Check length
  if (value.length > MAX_STRING_LENGTH) {
    throw new Error(`String exceeds maximum length of ${MAX_STRING_LENGTH}`);
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error('Input contains potentially malicious content');
    }
  }

  return value.trim();
}

/** Validate and sanitize email */
export function validateEmail(email: string): string {
  const sanitized = sanitizeString(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  if (sanitized.length > 254) {
    throw new Error('Email exceeds maximum length');
  }

  return sanitized.toLowerCase();
}

/** Validate and sanitize URL */
export function validateUrl(url: string): string {
  const sanitized = sanitizeString(url);
  
  try {
    const parsed = new URL(sanitized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

/** Validate array length */
export function validateArrayLength(arr: unknown[]): void {
  if (!Array.isArray(arr)) {
    throw new Error('Expected an array');
  }
  
  if (arr.length > MAX_ARRAY_LENGTH) {
    throw new Error(`Array exceeds maximum length of ${MAX_ARRAY_LENGTH}`);
  }
}

/** Validate object is not deeply nested (prevent prototype pollution) */
export function validateObjectDepth(obj: unknown, maxDepth: number = 10, depth: number = 0): void {
  if (depth > maxDepth) {
    throw new Error('Object nesting exceeds maximum depth');
  }

  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error('Prototype pollution detected');
      }
      validateObjectDepth((obj as Record<string, unknown>)[key], maxDepth, depth + 1);
    }
  }
}

/** Middleware to prevent slow client attacks */
export function slowClientMiddleware(
  maxBodySize: number = 100 * 1024, // 100KB
  timeout: number = 30000, // 30 seconds
) {
  return async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    
    // Set reasonable timeout
    setTimeout(() => {
      if (!reply.sent) {
        reply.status(408).send({ error: 'Request timeout' });
      }
    }, timeout);
  };
}

/** Check request body size before parsing */
export function validateBodySize(size: number, maxSize: number = 1024 * 1024): void {
  if (size > maxSize) {
    throw Object.assign(new Error('Request body exceeds maximum size'), { statusCode: 413 });
  }
}

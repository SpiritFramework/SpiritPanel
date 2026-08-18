/**
 * Security utilities for sanitizing and validating data
 */

/** Sanitize user input to prevent XSS attacks */
export function sanitizeInput(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'\/]/g, (char) => map[char] ?? char);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/** Validate URL to prevent javascript: and data: URLs */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/** Remove sensitive data from error messages */
export function sanitizeErrorMessage(message: string): string {
  // Remove paths, API endpoints, and other sensitive info
  return message
    .replace(/\/[a-zA-Z0-9\/._-]+/g, '[path]')
    .replace(/https?:\/\/[^\s]+/g, '[url]')
    .replace(/database|connection string|token|secret|password|api_key/gi, '[sensitive]');
}

/** Validate content type is safe */
export function isSafeContentType(contentType: string): boolean {
  const safeTypes = [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'application/javascript',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  return safeTypes.some((type) => contentType.includes(type));
}

/** Encrypt sensitive data in localStorage (basic obfuscation) */
export function secureSetItem(key: string, value: string): void {
  try {
    const encoded = btoa(JSON.stringify({ v: value, t: Date.now() }));
    localStorage.setItem(key, encoded);
  } catch {
    console.warn('Failed to store item securely');
  }
}

/** Decrypt sensitive data from localStorage */
export function secureGetItem(key: string): string | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const decoded = JSON.parse(atob(item));
    // Invalidate after 24 hours
    if (Date.now() - decoded.t > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return decoded.v;
  } catch {
    return null;
  }
}

/** Generate a cryptographically random token */
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

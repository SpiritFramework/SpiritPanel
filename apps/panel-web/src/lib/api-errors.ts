/** Client-safe API error handling — never expose raw backend internals. */

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const SAFE_BY_STATUS: Record<number, string> = {
  400: 'The request could not be processed. Check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to perform this action.",
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current state. Refresh and try again.',
  413: 'The upload is too large.',
  422: 'Some fields are invalid. Please review and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'The service is temporarily unavailable.',
  503: 'The service is temporarily unavailable.',
};

const UNSAFE_PATTERNS = [
  /\bat\s+\S+\s*\(/i,
  /stack trace/i,
  /prisma/i,
  /sql/i,
  /errno/i,
  /econnrefused/i,
  /internal server error/i,
];

function looksUnsafe(raw: string): boolean {
  if (raw.length > 180) return true;
  if (raw.includes('\n')) return true;
  return UNSAFE_PATTERNS.some((p) => p.test(raw));
}

/** Map HTTP status + optional server message to a user-safe string. */
export function sanitizeClientError(status: number, raw?: string): string {
  if (status === 401 || status === 403) {
    return SAFE_BY_STATUS[status];
  }
  if (status >= 500) {
    return SAFE_BY_STATUS[status] ?? SAFE_BY_STATUS[500];
  }
  if (raw && !looksUnsafe(raw)) {
    return raw;
  }
  return SAFE_BY_STATUS[status] ?? 'Request failed. Please try again.';
}

export const AUTH_SESSION_EXPIRED = 'auth:session-expired';

let sessionExpiredDispatched = false;

/** Notify the app that the session is no longer valid (401). Debounced per page load. */
export function dispatchSessionExpired(): void {
  if (sessionExpiredDispatched) return;
  sessionExpiredDispatched = true;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED));
}

/** Reset debounce after a successful login so future 401s are handled again. */
export function resetSessionExpiredFlag(): void {
  sessionExpiredDispatched = false;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Gateway / upstream failures — API process down or proxy cannot connect. */
export function isServiceUnavailable(err: unknown): boolean {
  if (!isApiError(err)) {
    return err instanceof TypeError;
  }
  return err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504;
}

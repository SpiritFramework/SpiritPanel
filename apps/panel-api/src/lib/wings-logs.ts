import { WingsError } from '../services/wings-client.js';

/** Normalize Wings / FeatherPanel log payloads to line arrays. */
export function normalizeWingsLogLines(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw || typeof raw !== 'object') return [];

  const payload = raw as { data?: unknown; response?: unknown };
  const data = payload.data ?? payload.response;

  if (Array.isArray(data)) return data.map(String);
  if (typeof data === 'string') {
    return data
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
  }
  return [];
}

/** Wings returns 404 when no install container exists — treat as empty logs, not a gateway error. */
export function emptyInstallLogsIfUnavailable(err: unknown): string[] | null {
  if (err instanceof WingsError && err.status === 404) return [];
  return null;
}

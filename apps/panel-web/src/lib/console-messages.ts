import type { ConsoleLineKind } from './console-buffer';

/** Normalize daemon console lines for clearer display. */
export function classifyConsoleLine(text: string, defaultKind: ConsoleLineKind): ConsoleLineKind {
  const trimmed = text.trim();
  if (/^\[FeatherPanel Daemon\]: Exit code: 143\b/i.test(trimmed)) return 'system';
  if (/^\[FeatherPanel Daemon\]: Exit code:/i.test(trimmed)) return 'system';
  if (/^container (exited|died|stopped)/i.test(trimmed)) return 'system';
  return defaultKind;
}

export function formatConsoleLineText(text: string): string {
  const trimmed = text.trim();
  if (/^\[FeatherPanel Daemon\]: Exit code: 143\b/i.test(trimmed)) {
    return '[Daemon] Server process stopped (normal shutdown)';
  }
  if (/^\[FeatherPanel Daemon\]: Exit code: (\d+)/i.test(trimmed)) {
    const code = trimmed.match(/Exit code: (\d+)/i)?.[1];
    return `[Daemon] Process exited with code ${code ?? 'unknown'}`;
  }
  return text;
}

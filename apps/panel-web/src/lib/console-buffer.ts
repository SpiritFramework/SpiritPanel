import { keepAnsiColors, stripAnsi } from './ansi';

export type ConsoleLineKind = 'stdout' | 'install' | 'system' | 'error';

export interface ConsoleLine {
  id: string;
  text: string;
  kind: ConsoleLineKind;
  at: number;
}

const MAX_LINES = 5000;
const buffers = new Map<string, ConsoleLine[]>();
let lineSeq = 0;

function storageKey(serverId: string) {
  return `spirit-console:${serverId}`;
}

function loadStored(serverId: string): ConsoleLine[] {
  try {
    const raw = sessionStorage.getItem(storageKey(serverId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConsoleLine[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_LINES) : [];
  } catch {
    return [];
  }
}

function persist(serverId: string, lines: ConsoleLine[]) {
  try {
    sessionStorage.setItem(storageKey(serverId), JSON.stringify(lines.slice(-MAX_LINES)));
  } catch {
    /* quota */
  }
}

export function getConsoleLines(serverId: string): ConsoleLine[] {
  if (!buffers.has(serverId)) {
    buffers.set(serverId, loadStored(serverId));
  }
  return buffers.get(serverId)!;
}

export function appendConsoleLine(
  serverId: string,
  text: string,
  kind: ConsoleLineKind = 'stdout',
): ConsoleLine[] {
  const chunk = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line, i, arr) => line.length > 0 || i < arr.length - 1);
  const lines = getConsoleLines(serverId);
  for (const part of chunk) {
    // Keep color (SGR) codes for rendering; strip cursor/clear/OSC noise.
    const cleaned = keepAnsiColors(part);
    if (!stripAnsi(cleaned).trim()) continue;
    const last = lines[lines.length - 1];
    if (last && last.text === cleaned && last.kind === kind) continue;
    lines.push({
      id: `${Date.now()}-${++lineSeq}`,
      text: cleaned,
      kind,
      at: Date.now(),
    });
  }
  while (lines.length > MAX_LINES) lines.shift();
  persist(serverId, lines);
  return lines;
}

/** All buffered lines for display. */
export function getVisibleConsoleLines(serverId: string): ConsoleLine[] {
  return getConsoleLines(serverId);
}

export function clearConsoleLines(serverId: string): void {
  buffers.set(serverId, []);
  sessionStorage.removeItem(storageKey(serverId));
}

export { stripAnsi };

export function consoleLinesToText(lines: ConsoleLine[]): string {
  return lines.map((l) => stripAnsi(l.text)).join('\n');
}

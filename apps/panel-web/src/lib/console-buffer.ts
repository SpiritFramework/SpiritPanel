export type ConsoleLineKind = 'stdout' | 'install' | 'system' | 'error';

export interface ConsoleLine {
  id: string;
  text: string;
  kind: ConsoleLineKind;
  at: number;
}

export const CONSOLE_VISIBLE_LINES = 50;
const MAX_LINES = 100;
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
  const chunk = text.replace(/\r\n/g, '\n').split('\n').filter((line, i, arr) => line.length > 0 || i < arr.length - 1);
  const lines = getConsoleLines(serverId);
  for (const part of chunk) {
    const text = stripAnsi(part);
    if (!text.trim()) continue;
    const last = lines[lines.length - 1];
    if (last && last.text === text && last.kind === kind) continue;
    lines.push({
      id: `${Date.now()}-${++lineSeq}`,
      text,
      kind,
      at: Date.now(),
    });
  }
  while (lines.length > MAX_LINES) lines.shift();
  persist(serverId, lines);
  return lines;
}

/** Last N lines for display — avoids copying the full buffer on every append. */
export function getVisibleConsoleLines(serverId: string, limit = CONSOLE_VISIBLE_LINES): ConsoleLine[] {
  const lines = getConsoleLines(serverId);
  return lines.length <= limit ? lines : lines.slice(-limit);
}

export function clearConsoleLines(serverId: string): void {
  buffers.set(serverId, []);
  sessionStorage.removeItem(storageKey(serverId));
}

export function stripAnsi(input: string): string {
  return input
    // OSC (window title, hyperlinks, etc.): ESC ] … BEL or ESC ] … ESC \
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // CSI (colors, cursor): ESC [ … final byte
    .replace(/\x1b\[[0-9?]*[ -/]*[@-~]/g, '')
    // C1 CSI (U+009B)
    .replace(/\x9b[0-9?]*[ -/]*[@-~]/g, '')
    // Other two-byte ESC sequences
    .replace(/\x1b[@-Z\\-_]/g, '')
    // Stray BEL from partial OSC
    .replace(/\x07/g, '');
}

export function consoleLinesToText(lines: ConsoleLine[]): string {
  return lines.map((l) => l.text).join('\n');
}

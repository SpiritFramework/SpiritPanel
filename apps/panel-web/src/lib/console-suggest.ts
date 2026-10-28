export type ConsoleSuggestResponse = {
  id: string;
  line: string;
  cursor: number;
  start: number;
  end: number;
  suggestions: string[];
};

export type ConsoleSuggestion = {
  start: number;
  end: number;
  suggestions: string[];
};

/** Replace the [start, end) range Wings returned for Tab completion. */
export function applyConsoleSuggestion(line: string, start: number, end: number, suggestion: string) {
  const from = clampIndex(line, start);
  const to = Math.max(from, clampIndex(line, end));
  const next = `${line.slice(0, from)}${suggestion}${line.slice(to)}`;
  return { line: next, cursor: from + suggestion.length };
}

function clampIndex(line: string, index: number) {
  if (!Number.isFinite(index) || index < 0) return 0;
  if (index > line.length) return line.length;
  return index;
}

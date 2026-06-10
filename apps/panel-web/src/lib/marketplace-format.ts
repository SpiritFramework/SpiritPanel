export function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 30) return `Updated ${days}d ago`;
  if (days < 365) return `Updated ${Math.floor(days / 30)}mo ago`;
  return `Updated ${Math.floor(days / 365)}y ago`;
}

export function cfgResourceFromPath(installPath: string, fallback: string): string {
  const parts = installPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && !last.startsWith('[')) return last;
  return fallback;
}

const LANGUAGE_COLORS: Record<string, string> = {
  Lua: '#2d6fb8',
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572a5',
  Shell: '#89e051',
};

export function languageAccent(language?: string | null): string {
  if (!language) return 'var(--muted)';
  return LANGUAGE_COLORS[language] ?? 'var(--accent)';
}

export const MARKETPLACE_CATEGORY_LABELS: Record<string, string> = {
  library: 'Library',
  framework: 'Framework',
  script: 'Script',
  voice: 'Voice',
  ui: 'UI',
  jobs: 'Jobs',
  map: 'Map',
  vehicle: 'Vehicle',
  other: 'Other',
};

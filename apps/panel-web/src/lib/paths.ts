export function joinPath(base: string, name: string): string {
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  if (normalized === '' || normalized === '/') return `/${name}`;
  return `${normalized}/${name}`;
}

export function parentPath(dir: string): string {
  if (dir === '/' || dir === '') return '/';
  const parts = dir.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
}

export function pathSegments(dir: string): Array<{ label: string; path: string }> {
  if (dir === '/' || dir === '') return [];
  const parts = dir.split('/').filter(Boolean);
  return parts.map((part, i) => ({
    label: part,
    path: `/${parts.slice(0, i + 1).join('/')}`,
  }));
}

/** True when `child` is `parent` or nested under `parent`. */
export function isPathInside(parent: string, child: string): boolean {
  const normalizedParent = parent === '/' ? '/' : parent.replace(/\/$/, '');
  if (child === normalizedParent) return true;
  return child.startsWith(`${normalizedParent}/`);
}

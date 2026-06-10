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
  if (dir === '/') return [{ label: 'root', path: '/' }];
  const parts = dir.split('/').filter(Boolean);
  return parts.map((part, i) => ({
    label: part,
    path: `/${parts.slice(0, i + 1).join('/')}`,
  }));
}

export class UnsafeFilePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeFilePathError';
  }
}

/** Reject path traversal and non-absolute server paths before sending to Wings. */
export function assertSafeServerPath(path: string, label = 'path'): string {
  const normalized = path.replace(/\\/g, '/').trim();
  if (!normalized || !normalized.startsWith('/')) {
    throw new UnsafeFilePathError(`${label} must be an absolute path`);
  }
  if (normalized.includes('\0') || normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new UnsafeFilePathError(`${label} contains invalid segments`);
  }
  return normalized.replace(/\/{2,}/g, '/');
}

export function assertSafeFileName(name: string, label = 'filename'): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) {
    throw new UnsafeFilePathError(`${label} is invalid`);
  }
  if (trimmed === '.' || trimmed === '..' || trimmed.includes('..')) {
    throw new UnsafeFilePathError(`${label} contains invalid segments`);
  }
  return trimmed;
}

/** Relative path under a server root (may contain slashes, no traversal). */
export function assertSafeRelativePath(relative: string, label = 'path'): string {
  const normalized = relative.replace(/\\/g, '/').trim().replace(/^\/+/, '');
  if (!normalized) {
    throw new UnsafeFilePathError(`${label} is invalid`);
  }
  if (normalized.includes('\0') || normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new UnsafeFilePathError(`${label} contains invalid segments`);
  }
  return normalized.replace(/\/{2,}/g, '/');
}

/** True when `child` is `parent` or nested under `parent`. */
export function isPathInside(parent: string, child: string): boolean {
  const normalizedParent = parent === '/' ? '/' : parent.replace(/\/$/, '');
  if (child === normalizedParent) return true;
  return child.startsWith(`${normalizedParent}/`);
}

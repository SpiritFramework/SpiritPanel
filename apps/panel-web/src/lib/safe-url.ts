const BLOCKED_PROTOCOLS = /^(javascript|data|vbscript|file|blob):/i;

export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || BLOCKED_PROTOCOLS.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function isSafePanelAssetPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;
  if (trimmed.length > 512) return false;
  if (/[\0<>"']/.test(trimmed)) return false;
  return true;
}

export function isSafeImageSrc(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isSafePanelAssetPath(trimmed)) return true;
  return isSafeHttpUrl(trimmed);
}

export function sanitizeImageSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  return isSafeImageSrc(value) ? value.trim() : null;
}

export function sanitizeLinkHref(value: string | null | undefined): string | null {
  if (!value) return null;
  return isSafeHttpUrl(value) ? value.trim() : null;
}

import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const BRANDING_DIR = resolve(process.cwd(), 'data', 'branding');

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

const ALLOWED_MIMES: Record<'logo' | 'favicon', Set<string>> = {
  logo: new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']),
  favicon: new Set([
    'image/png',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/svg+xml',
    'image/webp',
  ]),
};

const MAX_BYTES: Record<'logo' | 'favicon', number> = {
  logo: 512 * 1024,
  favicon: 256 * 1024,
};

export const BRANDING_ASSET_PREFIX = '/api/auth/branding/assets';

async function ensureDir() {
  await mkdir(BRANDING_DIR, { recursive: true });
}

export async function saveBrandingAsset(
  kind: 'logo' | 'favicon',
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!ALLOWED_MIMES[kind].has(mimeType)) {
    throw new Error(`Unsupported file type for ${kind}`);
  }
  if (buffer.length > MAX_BYTES[kind]) {
    throw new Error(`File too large (max ${Math.round(MAX_BYTES[kind] / 1024)} KB)`);
  }

  const ext = MIME_EXT[mimeType] ?? 'bin';
  const filename = `${kind}.${ext}`;

  await ensureDir();
  await writeFile(join(BRANDING_DIR, filename), buffer);

  // Remove other extensions for this kind
  for (const otherExt of new Set(Object.values(MIME_EXT))) {
    if (otherExt === ext) continue;
    try {
      await unlink(join(BRANDING_DIR, `${kind}.${otherExt}`));
    } catch {
      /* ignore missing files */
    }
  }

  return `${BRANDING_ASSET_PREFIX}/${filename}`;
}

export async function deleteBrandingAsset(kind: 'logo' | 'favicon') {
  await ensureDir();
  for (const ext of new Set(Object.values(MIME_EXT))) {
    try {
      await unlink(join(BRANDING_DIR, `${kind}.${ext}`));
    } catch {
      /* ignore */
    }
  }
}

export function resolveBrandingAssetPath(filename: string): string | null {
  if (!/^(logo|favicon)\.[a-z0-9]+$/i.test(filename)) return null;
  return join(BRANDING_DIR, filename);
}

export async function brandingAssetExists(filename: string): Promise<boolean> {
  const path = resolveBrandingAssetPath(filename);
  if (!path) return false;
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

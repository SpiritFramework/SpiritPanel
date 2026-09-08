import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { manifestIcons, pngAssetFilename, readPngSize, shortName } from './web-manifest.js';

const ICON_DIR = join(import.meta.dirname, '..', '..', '..', 'panel-web', 'public', 'icons');

test('readPngSize reads dimensions from the bundled icons', async () => {
  for (const [file, expected] of [
    ['icon-32.png', 32],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['apple-touch-icon.png', 180],
  ] as const) {
    const size = readPngSize(await readFile(join(ICON_DIR, file)));
    assert.deepEqual(size, { width: expected, height: expected }, file);
  }
});

test('readPngSize rejects non-PNG data', () => {
  assert.equal(readPngSize(Buffer.alloc(0)), null);
  assert.equal(readPngSize(Buffer.from('not an image at all, definitely not')), null);
  // Valid signature but truncated before IHDR.
  assert.equal(readPngSize(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), null);
});

test('pngAssetFilename strips the cache-busting query', () => {
  const prefix = '/api/auth/branding/assets';
  assert.equal(pngAssetFilename(`${prefix}/appicon.png?v=1758312000000`), 'appicon.png');
  assert.equal(pngAssetFilename(`${prefix}/favicon.png`), 'favicon.png');
});

test('pngAssetFilename rejects non-PNG and remote sources', () => {
  const prefix = '/api/auth/branding/assets';
  assert.equal(pngAssetFilename(''), null);
  assert.equal(pngAssetFilename(`${prefix}/favicon.ico`), null);
  assert.equal(pngAssetFilename(`${prefix}/logo.webp?v=1`), null);
  // Externally hosted images can't be measured on disk.
  assert.equal(pngAssetFilename('https://cdn.example.com/icon.png'), null);
});

test('manifestIcons falls back to the bundled set', () => {
  const icons = manifestIcons(null);
  assert.equal(icons.length, 3);
  // Installability needs at least one icon of 192px or more.
  assert.ok(icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(icons.some((icon) => icon.purpose === 'maskable'));
});

test('manifestIcons returns a branded icon alone', () => {
  const branded = {
    src: '/api/auth/branding/assets/appicon.png?v=1',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any maskable',
  };
  const icons = manifestIcons(branded);
  // Any bundled entry at the same size could win icon selection instead.
  assert.deepEqual(icons, [branded]);
  assert.ok(!icons.some((icon) => icon.src.startsWith('/icons/')));
});

test('shortName keeps home-screen labels short', () => {
  assert.equal(shortName('Spirit'), 'Spirit');
  assert.equal(shortName('  '), 'Panel');
  // Falls back to the first word when the full name is too long.
  assert.equal(shortName('Nebula Game Hosting'), 'Nebula');
  assert.equal(shortName('Spirit-Panel · SpiritFramework'), 'Spirit');
  // No short first word available, so it hard-truncates.
  assert.equal(shortName('Supercalifragilistic'), 'Supercalifra');
  assert.equal(shortName('Spirit').length <= 12, true);
});

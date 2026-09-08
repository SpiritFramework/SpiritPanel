/**
 * Regenerates the default PWA icons in `public/icons`.
 *
 * These are only fallbacks: a deploy that uploads a Branding Studio logo/favicon
 * gets those in the manifest instead. Run with `node scripts/generate-pwa-icons.mjs`.
 *
 * Dependency-free on purpose — the monorepo has no raster image library, so this
 * encodes PNGs directly with zlib.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/** Matches DEFAULT_PANEL_BRANDING accentColor / secondaryColor. */
const GRADIENT_FROM = [0x63, 0x66, 0xf1];
const GRADIENT_TO = [0x8b, 0x5c, 0xf6];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** @param {Uint8Array} rgba RGBA rows, length = w * h * 4 */
function encodePng(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Filter byte 0 (None) in front of every scanline.
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const src = y * w * 4;
    const dst = y * (w * 4 + 1);
    raw[dst] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + src, w * 4).copy(raw, dst + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Signed-distance style hit test for a rounded rectangle. */
function inRoundedRect(x, y, left, top, w, h, r) {
  const right = left + w;
  const bottom = top + h;
  if (x < left || x > right || y < top || y > bottom) return false;
  const cx = Math.min(Math.max(x, left + r), right - r);
  const cy = Math.min(Math.max(y, top + r), bottom - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Draws the mark: a gradient tile with three white "server" pills, each punched
 * by a small hole that lets the gradient show through.
 *
 * @param {number} size    output pixel size
 * @param {object} opts
 * @param {boolean} opts.rounded  round the tile corners (false = full bleed)
 * @param {number}  opts.content  fraction of the canvas the pills may occupy
 */
function renderIcon(size, { rounded, content }) {
  const rgba = new Uint8Array(size * size * 4);
  const SS = 4; // supersampling factor per axis, for antialiasing
  const tileRadius = rounded ? size * 0.22 : 0;

  const barsW = size * content;
  const barH = barsW * 0.208;
  const gap = barH * 0.66;
  const barsH = barH * 3 + gap * 2;
  const barsLeft = (size - barsW) / 2;
  const barsTop = (size - barsH) / 2;
  const holeR = barH * 0.21;
  const holeCx = barsLeft + barH * 0.62;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;

          if (!inRoundedRect(x, y, 0, 0, size, size, tileRadius)) continue;

          const t = Math.min(1, Math.max(0, (x / size + y / size) / 2));
          let cr = lerp(GRADIENT_FROM[0], GRADIENT_TO[0], t);
          let cg = lerp(GRADIENT_FROM[1], GRADIENT_TO[1], t);
          let cb = lerp(GRADIENT_FROM[2], GRADIENT_TO[2], t);

          for (let i = 0; i < 3; i++) {
            const top = barsTop + i * (barH + gap);
            if (!inRoundedRect(x, y, barsLeft, top, barsW, barH, barH / 2)) continue;
            const hy = top + barH / 2;
            const dx = x - holeCx;
            const dy = y - hy;
            // Inside the hole the gradient stays visible.
            if (dx * dx + dy * dy > holeR * holeR) {
              cr = 255;
              cg = 255;
              cb = 255;
            }
            break;
          }

          r += cr;
          g += cg;
          b += cb;
          a += 255;
        }
      }

      const samples = SS * SS;
      const idx = (py * size + px) * 4;
      if (a === 0) continue;
      // Un-premultiply so edge pixels keep full colour against any backdrop.
      const covered = a / 255;
      rgba[idx] = Math.round(r / covered);
      rgba[idx + 1] = Math.round(g / covered);
      rgba[idx + 2] = Math.round(b / covered);
      rgba[idx + 3] = Math.round(a / samples);
    }
  }

  return encodePng(rgba, size, size);
}

const TARGETS = [
  // Browser tab / bookmark fallback.
  { file: 'icon-32.png', size: 32, rounded: true, content: 0.66 },
  { file: 'icon-192.png', size: 192, rounded: true, content: 0.56 },
  { file: 'icon-512.png', size: 512, rounded: true, content: 0.56 },
  // Maskable: full bleed, content kept well inside the safe zone.
  { file: 'icon-512-maskable.png', size: 512, rounded: false, content: 0.42 },
  // iOS applies its own corner mask, so ship this one square.
  { file: 'apple-touch-icon.png', size: 180, rounded: false, content: 0.56 },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const { file, size, rounded, content } of TARGETS) {
  const png = renderIcon(size, { rounded, content });
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`${file.padEnd(24)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

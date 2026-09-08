import fs from 'fs';

const path = 'C:/Users/callu/Documents/spirithost/Spirit-Billing/Spirit-PanelV4/Spirit-PanelV4/apps/panel-web/src/design-system.css';
let css = fs.readFileSync(path, 'utf8');
const marker = '/* ── Server analytics';
const idx = css.indexOf(marker);
if (idx < 0) throw new Error('marker not found');
const head = css.slice(0, idx);
let tail = css.slice(idx);

const HEADER_ACCENT =
  'background: linear-gradient(180deg, var(--accent-hover) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 45%, #000) 100%);';
const ICON_WRAP_BG =
  'linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--surface)) 0%, color-mix(in srgb, color-mix(in srgb, var(--accent) 45%, #000) 8%, var(--surface)) 100%)';
const FILL_GRAD = 'linear-gradient(90deg, var(--accent-hover), var(--accent))';

const THEME_HEX = new Set([
  '#818cf8', '#4f46e5', '#312e81', '#a5b4fc',
  '#22d3ee', '#0891b2', '#164e63', '#67e8f9', '#0284c7',
  '#10b981', '#6ee7b7', '#064e3b', '#34d399',
  '#a78bfa', '#8b5cf6', '#c4b5fd', '#4c1d95',
  '#60a5fa', '#3b82f6', '#93c5fd', '#1e3a8a',
  '#fb923c', '#b45309',
  '#94a3b8', '#64748b', '#cbd5e1', '#475569', '#1e293b', '#334155',
  '#e879f9', '#d946ef', '#f0abfc', '#f9a8d4', '#86198f',
]);

const KEEP_HEX = new Set([
  '#fff', '#000',
  '#fbbf24', '#fcd34d', '#d97706', '#78350f', '#f59e0b',
  '#f87171', '#fca5a5', '#fda4af',
  '#059669', '#22c55e', '#86efac', '#4ade80', '#bbf7d0', '#166534',
  '#38bdf8', '#7dd3fc',
  '#f472b6',
]);

const SRV_PREFIXES = ['an', 'act', 'bk', 'db', 'sch', 'net', 'stu', 'set', 'sub'];

function isInSrvBlock(line, state) {
  const open = line.match(/^\.ds-srv-([a-z]+)-/);
  if (open) {
    const prefix = open[1];
    if (prefix === 'fm') {
      state.active = false;
      return false;
    }
    if (SRV_PREFIXES.includes(prefix)) {
      state.active = true;
      state.prefix = prefix;
      return true;
    }
    state.active = false;
    return false;
  }
  if (/^\.ds-srv-fm-/.test(line)) {
    state.active = false;
    return false;
  }
  if (/^\.ds-/.test(line) && !/^\.ds-srv-/.test(line)) {
    state.active = false;
    return false;
  }
  if (/^\.ds-srv-/.test(line) && !SRV_PREFIXES.some((p) => line.startsWith(`.ds-srv-${p}-`))) {
    state.active = false;
    return false;
  }
  return state.active;
}

function brandifyContent(text) {
  let l = text;

  l = l.replace(
    /color-mix\(in srgb, var\(--border\) 75%, #[0-9a-fA-F]{3,8} 12%\)/g,
    'color-mix(in srgb, var(--border) 75%, var(--accent) 12%)',
  );

  l = l.replace(
    /background: linear-gradient\(180deg, #[0-9a-fA-F]{3,8} 0%, #[0-9a-fA-F]{3,8} 55%, #[0-9a-fA-F]{3,8} 100%\);/g,
    HEADER_ACCENT,
  );

  l = l.replace(
    /background: linear-gradient\(180deg, #[0-9a-fA-F]{3,8}, #[0-9a-fA-F]{3,8}\);/g,
    `background: linear-gradient(180deg, var(--accent-hover), var(--accent));`,
  );

  l = l.replace(
    /background: linear-gradient\(90deg, (#[0-9a-fA-F]{3,8}), (#[0-9a-fA-F]{3,8})\)/g,
    (m, a, b) => {
      if (THEME_HEX.has(a.toLowerCase()) || THEME_HEX.has(b.toLowerCase())) return `background: ${FILL_GRAD}`;
      return m;
    },
  );

  l = l.replace(
    /color-mix\(in srgb, #[0-9a-fA-F]{3,8} 30%, var\(--border\)\)/g,
    'color-mix(in srgb, var(--accent) 30%, var(--border))',
  );

  l = l.replace(
    /linear-gradient\(135deg, color-mix\(in srgb, #[0-9a-fA-F]{3,8} 14%, var\(--surface\)\) 0%, color-mix\(in srgb, #[0-9a-fA-F]{3,8} 8%, var\(--surface\)\) 100%\)/g,
    ICON_WRAP_BG,
  );

  l = l.replace(/color-mix\(in srgb, (#[0-9a-fA-F]{3,8}) (\d+%),/g, (m, hex, pct) => {
    if (THEME_HEX.has(hex.toLowerCase())) return `color-mix(in srgb, var(--accent) ${pct},`;
    return m;
  });

  return l;
}

const state = { active: false, prefix: '' };
const lines = tail.split('\n');
const out = [];

for (const line of lines) {
  isInSrvBlock(line, state);
  if (state.active && !line.includes('.ds-srv-fm-')) {
    let l = brandifyContent(line);

    // Stat icon colors — accent for decorative, keep semantic
    if (/\.ds-srv-(?:an|act|bk|db|sch|net|stu|set|sub)-stat-icon--/.test(line)) {
      l = l.replace(/\bcolor: (#[0-9a-fA-F]{3,8});/g, (m, hex) => {
        const h = hex.toLowerCase();
        if (KEEP_HEX.has(h)) return m;
        if (THEME_HEX.has(h) || ['#7dd3fc', '#a5b4fc', '#93c5fd', '#f9a8d4'].includes(h)) {
          return 'color: var(--accent-hover);';
        }
        return m;
      });
      l = l.replace(/background: color-mix\(in srgb, #[0-9a-fA-F]{3,8}/g, 'background: color-mix(in srgb, var(--accent)');
    }

    // Generic decorative color on property lines inside srv blocks
    if (/^\s+(color|border-color): #[0-9a-fA-F]{3,8}/.test(l)) {
      l = l.replace(/\bcolor: (#[0-9a-fA-F]{3,8});/g, (m, hex) => {
        const h = hex.toLowerCase();
        if (KEEP_HEX.has(h) || !THEME_HEX.has(h)) return m;
        return 'color: var(--accent-hover);';
      });
    }

    out.push(l);
  } else {
    out.push(line);
  }
}

let joined = out.join('\n');

// Block-level replacements
joined = joined.replace(/\.ds-srv-an-live-tile-icon--cpu \{[^}]+\}/g, `.ds-srv-an-live-tile-icon--cpu {
  color: var(--accent-hover);
  background: var(--accent-muted);
}`);

joined = joined.replace(/\.ds-srv-an-live-tile--cpu \.ds-srv-an-live-tile-fill \{[^}]+\}/g, `.ds-srv-an-live-tile--cpu .ds-srv-an-live-tile-fill {
  background: ${FILL_GRAD};
}`);

joined = joined.replace(/\.ds-srv-an-panel-icon \{[^}]+\}/g, (block) =>
  block
    .replace(/color: #[0-9a-fA-F]{3,8};/, 'color: var(--accent-hover);')
    .replace(/background: [^;]+;/, 'background: var(--accent-muted);'),
);

const statBlocks = [
  ['bk-stat-icon--size', 'var(--accent)', 'color-mix(in srgb, var(--accent) 12%, transparent)'],
  ['sch-stat-icon--total', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['sch-stat-icon--capacity', 'var(--accent)', 'color-mix(in srgb, var(--accent) 12%, transparent)'],
  ['net-stat-icon--ports', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['net-stat-icon--additional', 'var(--accent)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['net-stat-icon--capacity', 'var(--accent)', 'color-mix(in srgb, var(--accent) 12%, transparent)'],
  ['db-stat-icon--slots', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['db-stat-icon--engine', 'var(--accent)', 'color-mix(in srgb, var(--accent) 12%, transparent)'],
  ['db-stat-icon--hosts', 'var(--accent-hover)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['db-stat-icon--capacity', 'var(--accent)', 'color-mix(in srgb, var(--accent) 12%, transparent)'],
  ['act-stat-icon--total', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['act-stat-icon--loaded', 'var(--accent)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['stu-stat-icon--editable', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['stu-stat-icon--vars', 'var(--accent)', 'color-mix(in srgb, var(--accent) 12%, transparent)'],
  ['stu-stat-icon--memory', 'var(--accent-hover)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['stu-stat-icon--disk', 'var(--accent)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['stu-stat-icon--cpu', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['set-stat-icon--memory', 'var(--accent-hover)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['set-stat-icon--disk', 'var(--accent)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['set-stat-icon--cpu', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['set-stat-icon--meta', 'var(--muted)', 'color-mix(in srgb, var(--border) 35%, transparent)'],
  ['sub-stat-icon--members', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['sub-stat-icon--granted', 'var(--accent)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
  ['sub-stat-icon--avg', 'var(--accent-hover)', 'var(--accent-muted)'],
  ['sub-stat-icon--catalog', 'var(--accent)', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
];

for (const [cls, color, bg] of statBlocks) {
  const re = new RegExp(`\\.ds-srv-${cls} \\{[^}]+\\}`, 'g');
  joined = joined.replace(re, `.ds-srv-${cls} {
  color: ${color};
  background: ${bg};
}`);
}

fs.writeFileSync(path, head + joined);

let remaining = 0;
const state2 = { active: false };
for (const line of joined.split('\n')) {
  isInSrvBlock(line, state2);
  if (!state2.active) continue;
  for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}/gi)) {
    const h = m[0].toLowerCase();
    if (THEME_HEX.has(h)) {
      remaining++;
      console.log('LEFT', h, line.trim().slice(0, 100));
    }
  }
}
console.log('remaining theme hex refs:', remaining);

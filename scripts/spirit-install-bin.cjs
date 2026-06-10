#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const tsx = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const script = path.join(__dirname, 'spirit-install.ts');

const result = spawnSync(process.execPath, [tsx, script, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: root,
});

process.exit(result.status ?? 1);

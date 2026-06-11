#!/usr/bin/env tsx
/**
 * Pre-flight check before production deploy or systemd start.
 * Usage: pnpm verify:prod
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, 'apps/panel-api/.env') });

process.env.NODE_ENV = 'production';

async function main() {
  console.log('Spirit-Panel production verification\n');

  const envPath = resolve(root, 'apps/panel-api/.env');
  const fs = await import('node:fs');
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envPath}`);
    console.error('Copy deploy/env/production.example to apps/panel-api/.env and edit secrets.');
    process.exit(1);
  }

  try {
    fs.accessSync(envPath, fs.constants.R_OK);
    const stat = fs.statSync(envPath);
    if ((stat.mode & 0o077) !== 0) {
      console.warn('  .env permissions: world/group readable — run: chmod 600 apps/panel-api/.env');
    } else {
      console.log('  .env permissions: OK (not world-readable)');
    }
  } catch {
    console.error('  .env permissions: FAILED — spirit-panel-api user cannot read this file');
    console.error('  Fix: sudo chown spiritpanel:spiritpanel apps/panel-api/.env && sudo chmod 600 apps/panel-api/.env');
    process.exit(1);
  }

  let cfg;
  try {
    const { loadConfig } = await import('../apps/panel-api/src/lib/env.js');
    cfg = loadConfig();
    console.log('  Environment variables: OK');
  } catch (err) {
    console.error('  Environment variables: FAILED');
    console.error(`  ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const distIndex = resolve(root, 'apps/panel-api/dist/index.js');
  if (!fs.existsSync(distIndex)) {
    console.error('  API build: MISSING — run pnpm build');
    process.exit(1);
  }
  console.log('  API build: OK');

  const webIndex = resolve(root, 'apps/panel-web/dist/index.html');
  if (!fs.existsSync(webIndex)) {
    console.error('  Web build: MISSING — run pnpm build');
    process.exit(1);
  }
  console.log('  Web build: OK');

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.warn('  Database: connected but empty — run: cd apps/panel-api && pnpm db:seed');
    } else {
      console.log(`  Database: OK (${userCount} user(s))`);
    }
  } catch (err) {
    console.error('  Database: FAILED');
    console.error(`  ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\nReady for production.');
  console.log(`  API_URL: ${cfg.apiUrl}`);
  console.log(`  Bind:    ${cfg.host}:${cfg.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

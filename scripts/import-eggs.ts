#!/usr/bin/env tsx
/**
 * Bulk import PTDL_v2 eggs from a local directory or parkervcp-style repo layout.
 * Usage: pnpm import-eggs -- --dir ./eggs --nest-id <id>
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { parseEggJson } from '@spirit/shared';

config({ path: path.resolve('apps/panel-api/.env') });

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  const nestIdx = args.indexOf('--nest-id');
  const createNest = args.includes('--create-nest');

  if (dirIdx === -1) {
    console.error('Usage: pnpm import-eggs -- --dir <eggs-directory> [--nest-id <id>] [--create-nest]');
    process.exit(1);
  }

  const dir = path.resolve(args[dirIdx + 1]);
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  let nestId = nestIdx !== -1 ? args[nestIdx + 1] : undefined;

  if (!nestId && createNest) {
    const nestName = path.basename(dir);
    const nest = await prisma.nest.create({
      data: { name: nestName, description: `Imported from ${dir}` },
    });
    nestId = nest.id;
    console.log(`Created nest: ${nest.name} (${nest.id})`);
  }

  if (!nestId) {
    console.error('Provide --nest-id or --create-nest');
    process.exit(1);
  }

  const files = findEggJsonFiles(dir);
  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const parsed = parseEggJson(raw);

      const existing = await prisma.egg.findFirst({
        where: { nestId, name: parsed.name },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.egg.create({
        data: {
          nestId,
          name: parsed.name,
          author: parsed.author,
          description: parsed.description,
          features: parsed.features,
          dockerImages: parsed.dockerImages,
          fileDenylist: parsed.fileDenylist,
          configFiles: parsed.configFiles ?? undefined,
          configStartup: parsed.configStartup ?? undefined,
          configLogs: parsed.configLogs ?? undefined,
          configStop: parsed.configStop,
          startup: parsed.startup,
          scriptInstall: parsed.scriptInstall,
          scriptEntry: parsed.scriptEntry,
          scriptContainer: parsed.scriptContainer,
          scriptPrivileged: parsed.scriptPrivileged,
          updateUrl: parsed.updateUrl,
          variables: {
            create: parsed.variables.map((v) => ({
              name: v.name,
              description: v.description,
              envVariable: v.envVariable,
              defaultValue: v.defaultValue,
              userViewable: v.userViewable,
              userEditable: v.userEditable,
              rules: v.rules,
              fieldType: v.fieldType,
            })),
          },
        },
      });
      imported++;
      console.log(`Imported: ${parsed.name}`);
    } catch (e) {
      console.warn(`Skip ${file}:`, e);
      skipped++;
    }
  }

  console.log(`Done. Imported: ${imported}, Skipped: ${skipped}`);
}

function findEggJsonFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findEggJsonFiles(full));
    } else if (entry.name.endsWith('.json') && (entry.name.includes('egg') || entry.name === 'egg.json')) {
      results.push(full);
    } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('package')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('"startup"') && content.includes('"meta"')) {
        results.push(full);
      }
    }
  }
  return results;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { isMarketplaceEnabled } from './panel-settings.js';
import { seedMarketplacePlugins } from '../services/marketplace-seed.js';

export function isMarketplaceSchemaMissing(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error);
  return /marketplace_plugins|marketplace_installs|marketplace_github_installs|doesn't exist|does not exist/i.test(message);
}

export const MARKETPLACE_SCHEMA_HINT =
  'Marketplace database tables are missing. Run: cd apps/panel-api && pnpm db:deploy';

let catalogSeedAttempted = false;

/** Seed default catalog once per process when tables exist but are empty. */
export async function ensureMarketplaceCatalog() {
  try {
    const count = await prisma.marketplacePlugin.count();
    if (count === 0 && !catalogSeedAttempted) {
      catalogSeedAttempted = true;
      await seedMarketplacePlugins(prisma);
    }
  } catch (error) {
    if (isMarketplaceSchemaMissing(error)) {
      const err = new Error(MARKETPLACE_SCHEMA_HINT);
      (err as { statusCode?: number }).statusCode = 503;
      throw err;
    }
    throw error;
  }
}

export async function assertMarketplaceEnabledForClients() {
  if (!(await isMarketplaceEnabled())) {
    const err = new Error('FiveM marketplace is disabled on this panel');
    (err as { statusCode?: number }).statusCode = 403;
    throw err;
  }
}

export async function withMarketplaceDb<T>(handler: () => Promise<T>): Promise<T> {
  try {
    await ensureMarketplaceCatalog();
    return await handler();
  } catch (error) {
    if (isMarketplaceSchemaMissing(error)) {
      const err = new Error(MARKETPLACE_SCHEMA_HINT);
      (err as { statusCode?: number }).statusCode = 503;
      throw err;
    }
    throw error;
  }
}

/** Load GitHub installs when the table exists; return [] if migration not applied yet. */
export async function listGithubInstalls(serverId: string) {
  try {
    return await prisma.marketplaceGithubInstall.findMany({
      where: { serverId },
      orderBy: { installedAt: 'desc' },
    });
  } catch (error) {
    if (isMarketplaceSchemaMissing(error)) return [];
    throw error;
  }
}

export async function isGithubInstallsSchemaReady(): Promise<boolean> {
  try {
    await prisma.marketplaceGithubInstall.count();
    return true;
  } catch (error) {
    if (isMarketplaceSchemaMissing(error)) return false;
    throw error;
  }
}

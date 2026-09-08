import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import {
  assertFiveMServerAccess,
  assertFiveMServerView,
} from '../../services/marketplace-installer.js';
import { assertMarketplaceEnabledForClients } from '../../lib/marketplace-db.js';
import { isFivemCatalogInstallsAllowed, isFivemGithubInstallsAllowed } from '../manager.js';
import { isGithubInstallsSchemaReady } from '../../lib/marketplace-db.js';

export type FivemAccessLevel = 'view' | 'install';

export class FivemMarketplaceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'FivemMarketplaceError';
  }
}

export interface FivemRequestContext {
  serverId: string;
  userId: string;
  server: NonNullable<Awaited<ReturnType<typeof assertFiveMServerView>>['server']>;
  canInstall: boolean;
  features: {
    catalog: boolean;
    github: boolean;
  };
}

const ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  not_fivem: 400,
  plan_denied: 403,
  forbidden: 403,
};

const ERROR_MESSAGE: Record<string, string> = {
  not_found: 'Not found',
  not_fivem: 'Marketplace is only available for FiveM servers',
  plan_denied: 'Marketplace is not included with this server plan.',
  forbidden: 'Permission denied',
};

export async function requireFivemMarketplaceContext(
  request: FastifyRequest,
  reply: FastifyReply,
  level: FivemAccessLevel = 'view',
): Promise<FivemRequestContext | null> {
  try {
    await assertMarketplaceEnabledForClients();
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 403;
    await reply.status(status).send({ error: err instanceof Error ? err.message : 'Marketplace disabled' });
    return null;
  }

  const { id: serverId } = request.params as { id: string };
  const userId = request.user!.id;

  const check =
    level === 'install'
      ? await assertFiveMServerAccess(serverId, userId)
      : await assertFiveMServerView(serverId, userId);

  if (check.error) {
    await reply.status(ERROR_STATUS[check.error] ?? 403).send({ error: ERROR_MESSAGE[check.error] ?? 'Not allowed' });
    return null;
  }

  const [catalogAllowed, githubSchemaReady, githubAllowed] = await Promise.all([
    isFivemCatalogInstallsAllowed(),
    isGithubInstallsSchemaReady(),
    isFivemGithubInstallsAllowed(),
  ]);

  return {
    serverId,
    userId,
    server: check.server!,
    canInstall: level === 'install',
    features: {
      catalog: catalogAllowed,
      github: githubSchemaReady && githubAllowed,
    },
  };
}

export function fivemErrorReply(
  reply: FastifyReply,
  err: unknown,
  log?: { error: (obj: object, msg: string) => void },
) {
  if (err instanceof FivemMarketplaceError) {
    return reply.status(err.statusCode).send({ error: err.message });
  }
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  if (statusCode >= 400 && statusCode < 500 && err instanceof Error) {
    return reply.status(statusCode).send({ error: err.message });
  }
  log?.error({ err }, 'FiveM marketplace error');
  return reply.status(statusCode >= 500 ? statusCode : 500).send({
    error: statusCode >= 500 ? 'Internal server error' : err instanceof Error ? err.message : 'Request failed',
  });
}

export async function assertGithubFeatureEnabled(ctx: FivemRequestContext, reply: FastifyReply): Promise<boolean> {
  if (ctx.features.github) return true;
  if (!(await isGithubInstallsSchemaReady())) {
    await reply.status(503).send({
      error: 'GitHub installs require a database update. Run: cd apps/panel-api && pnpm db:deploy',
    });
    return false;
  }
  await reply.status(403).send({ error: 'GitHub installs are disabled on this panel' });
  return false;
}

export async function assertCatalogFeatureEnabled(ctx: FivemRequestContext, reply: FastifyReply): Promise<boolean> {
  if (!ctx.features.catalog) {
    await reply.status(403).send({ error: 'Curated catalog installs are disabled on this panel' });
    return false;
  }
  return true;
}

export async function getInstalledPluginIds(serverId: string): Promise<Set<string>> {
  const rows = await prisma.marketplaceInstall.findMany({
    where: { serverId },
    select: { pluginId: true },
  });
  return new Set(rows.map((r) => r.pluginId));
}

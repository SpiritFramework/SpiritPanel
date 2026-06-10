import 'dotenv/config';

import Fastify from 'fastify';

import cors from '@fastify/cors';

import rateLimit from '@fastify/rate-limit';

import multipart from '@fastify/multipart';

import { getConfig } from './lib/env.js';

import { verifyDatabaseConnection, closeDatabase } from './lib/startup.js';

import { authRoutes } from './routes/auth.js';

import { adminRoutes } from './routes/admin.js';

import { clientRoutes } from './routes/client.js';

import { remoteRoutes } from './routes/remote.js';

import { applicationRoutes } from './routes/application.js';

import { backupRoutes, scheduleRoutes, adminBackupRoutes } from './routes/backups-schedules.js';

import { databaseRoutes, adminDatabaseRoutes } from './routes/databases.js';

import { marketplaceRoutes, adminMarketplaceRoutes } from './routes/marketplace.js';

import { requireAdmin } from './middleware/auth.js';

import { startScheduleWorker, stopScheduleWorker } from './workers/schedule.js';
import { startStatsCollector, stopStatsCollector } from './workers/stats-collector.js';
import { pingRedis } from './lib/redis.js';
import { ensureMarketplaceCatalog, isMarketplaceSchemaMissing } from './lib/marketplace-db.js';
import { API_SECURITY_HEADERS } from './lib/security-headers.js';



const config = getConfig();



const app = Fastify({

  logger: true,

  trustProxy: config.isProduction,

  // Branding assets (logo/favicon) are uploaded as base64 JSON; allow headroom
  // above the per-asset limits so the route returns a friendly error instead of a raw 413.
  bodyLimit: 16 * 1024 * 1024,

});



app.addHook('onSend', async (_request, reply, payload) => {
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    reply.header(name, value);
  }
  return payload;
});



await app.register(cors, {
  origin: config.isProduction
    ? config.corsOrigins
    : (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        try {
          const { hostname } = new URL(origin);
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            callback(null, true);
            return;
          }
        } catch {
          // reject below
        }
        callback(null, false);
      },
  credentials: true,
});



await app.register(rateLimit, {

  max: config.isProduction ? 300 : 200,

  timeWindow: '1 minute',

});



await app.register(multipart, {

  limits: { fileSize: 1024 * 1024 * 1024 },

});



const healthPayload = () => ({

  status: 'ok',

  service: 'spirit-panel-api',

  env: config.nodeEnv,

});



app.get('/health', async () => healthPayload());

app.get('/api/health', async () => healthPayload());



app.get('/health/ready', async (_req, reply) => {
  try {
    await verifyDatabaseConnection();
    const config = getConfig();
    const payload: Record<string, string> = { status: 'ready', database: 'connected' };

    if (!config.disableScheduleWorker) {
      const redisOk = await pingRedis();
      payload.redis = redisOk ? 'connected' : 'disconnected';
      if (!redisOk) {
        return reply.status(503).send({
          status: 'not_ready',
          ...payload,
          error: 'Redis unreachable — schedules will not run',
        });
      }
    } else {
      payload.redis = 'disabled';
    }

    return payload;
  } catch (err) {
    return reply.status(503).send({
      status: 'not_ready',
      database: 'disconnected',
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
});



await app.register(authRoutes, { prefix: '/api/auth' });

await app.register(adminRoutes, { prefix: '/api/admin' });

await app.register(clientRoutes, { prefix: '/api/client' });

await app.register(remoteRoutes, { prefix: '/api/remote' });

await app.register(applicationRoutes, { prefix: '/api/application' });

await app.register(backupRoutes, { prefix: '/api/client' });

await app.register(scheduleRoutes, { prefix: '/api/client' });

await app.register(adminBackupRoutes, { prefix: '/api/admin' });

await app.register(databaseRoutes, { prefix: '/api/client' });

await app.register(marketplaceRoutes, { prefix: '/api/client' });

await app.register(adminDatabaseRoutes, { prefix: '/api/admin' });

await app.register(
  async (adminMarketplaceApp) => {
    adminMarketplaceApp.addHook('preHandler', requireAdmin);
    await adminMarketplaceApp.register(adminMarketplaceRoutes);
  },
  { prefix: '/api/admin' },
);



async function shutdown() {
  app.log.info('Shutting down...');
  stopStatsCollector();
  await stopScheduleWorker();
  await closeDatabase();
  await app.close();
  process.exit(0);
}



process.on('SIGINT', shutdown);

process.on('SIGTERM', shutdown);



try {

  await verifyDatabaseConnection();

  app.log.info('Database connection verified');

  try {
    await ensureMarketplaceCatalog();
    app.log.info('Marketplace catalog ready');
  } catch (err) {
    if (isMarketplaceSchemaMissing(err)) {
      app.log.warn('Marketplace tables missing — run: cd apps/panel-api && pnpm db:deploy');
    } else {
      app.log.warn({ err }, 'Marketplace catalog seed skipped');
    }
  }

  startScheduleWorker();

  startStatsCollector();



  await app.listen({ port: config.port, host: config.host });

  app.log.info(`Spirit-Panel API listening on ${config.host}:${config.port}`);

  app.log.info(`API URL (Wings remote): ${config.apiUrl}`);

} catch (err) {

  app.log.error(err);

  process.exit(1);

}



export { app };


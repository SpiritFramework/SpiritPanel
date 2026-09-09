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

import { minecraftPluginRoutes } from './routes/minecraft-plugins.js';

import { clientTicketRoutes, adminTicketRoutes } from './routes/tickets.js';
import { clientPluginRoutes, adminPluginRoutes } from './routes/plugins.js';
import { alertRoutes, adminAlertRoutes } from './routes/alerts.js';
import { databaseManagerRoutes } from './plugins/database-manager/index.js';
import { ensureBuiltinPlugins } from './plugins/manager.js';

import { requireAdmin } from './middleware/auth.js';

import { startScheduleWorker, stopScheduleWorker } from './workers/schedule.js';
import { startStatsCollector, stopStatsCollector } from './workers/stats-collector.js';
import { startNodeHealthWorker, stopNodeHealthWorker } from './workers/node-health.js';
import { pingRedis, closeSharedRedis } from './lib/redis.js';
import { GLOBAL_RATE_LIMIT } from './lib/rate-limits.js';
import { MAX_UPLOAD_FILE_BYTES } from './lib/upload-concurrency.js';
import { API_SECURITY_HEADERS, HSTS_HEADER } from './lib/security-headers.js';
import { ZodError } from 'zod';
import type { FastifyError } from 'fastify';



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
  if (config.isProduction) {
    reply.header('Strict-Transport-Security', HSTS_HEADER);
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



await app.register(rateLimit, GLOBAL_RATE_LIMIT);

await app.register(multipart, {

  limits: { fileSize: MAX_UPLOAD_FILE_BYTES, files: 10 },

});



const healthPayload = () => ({

  status: 'ok',

  service: 'spirit-panel-api',

});



app.get('/health', async () => healthPayload());

app.get('/api/health', async () => healthPayload());

// Add request ID tracking for debugging
app.addHook('onRequest', async (request, reply) => {
  const requestId = request.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  request.id = requestId;
  reply.header('X-Request-ID', requestId);
});

// Global error handler to prevent information leakage
app.setErrorHandler(async (error, request, reply) => {
  app.log.error({ err: error, requestId: request.id }, 'Request error');

  const isProduction = getConfig().isProduction;

  if (error instanceof ZodError) {
    return reply.status(422).send({
      error: 'Validation failed',
      ...(isProduction ? {} : { issues: error.issues }),
      requestId: request.id,
    });
  }

  const statusCode =
    typeof (error as FastifyError).statusCode === 'number' ? (error as FastifyError).statusCode! : 500;
  const message = error instanceof Error ? error.message : 'An error occurred';

  if (isProduction && statusCode >= 500) {
    return reply.status(statusCode).send({
      error: 'Internal server error',
      requestId: request.id,
    });
  }

  return reply.status(statusCode).send({
    error: message,
    requestId: request.id,
  });
});



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
    app.log.error({ err }, 'Readiness check failed');
    return reply.status(503).send({
      status: 'not_ready',
      database: 'disconnected',
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

await app.register(databaseManagerRoutes, { prefix: '/api/client' });

await app.register(marketplaceRoutes, { prefix: '/api/client' });

await app.register(minecraftPluginRoutes, { prefix: '/api/client' });

await app.register(clientPluginRoutes, { prefix: '/api/client' });

await app.register(adminPluginRoutes, { prefix: '/api/admin' });

await app.register(clientTicketRoutes, { prefix: '/api/client' });

await app.register(alertRoutes, { prefix: '/api/client' });

await app.register(adminAlertRoutes, { prefix: '/api/admin' });

await app.register(adminDatabaseRoutes, { prefix: '/api/admin' });

await app.register(
  async (adminMarketplaceApp) => {
    adminMarketplaceApp.addHook('preHandler', requireAdmin);
    await adminMarketplaceApp.register(adminMarketplaceRoutes);
  },
  { prefix: '/api/admin' },
);

await app.register(adminTicketRoutes, { prefix: '/api/admin' });



async function shutdown() {
  app.log.info('Shutting down...');
  stopNodeHealthWorker();
  stopStatsCollector();
  await stopScheduleWorker();
  await closeSharedRedis();
  await closeDatabase();
  await app.close();
  process.exit(0);
}



process.on('SIGINT', shutdown);

process.on('SIGTERM', shutdown);



try {

  await verifyDatabaseConnection();

  app.log.info('Database connection verified');

  await ensureBuiltinPlugins();
  app.log.info('Panel plugins initialized');

  startScheduleWorker();

  startStatsCollector();

  startNodeHealthWorker();



  await app.listen({ port: config.port, host: config.host });

  app.log.info(`Spirit-Panel API listening on ${config.host}:${config.port}`);

  app.log.info(`API URL (Wings remote): ${config.apiUrl}`);

} catch (err) {

  app.log.error(err);

  process.exit(1);

}



export { app };


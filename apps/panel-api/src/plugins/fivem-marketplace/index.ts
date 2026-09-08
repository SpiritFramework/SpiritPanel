import type { FastifyInstance } from 'fastify';
import { fivemMarketplaceClientRoutes, adminMarketplaceRoutes } from './routes.js';

/** Register FiveM marketplace client routes under /servers/:id/marketplace */
export async function registerFivemMarketplaceRoutes(app: FastifyInstance) {
  await app.register(fivemMarketplaceClientRoutes, { prefix: '/servers/:id/marketplace' });
}

export { adminMarketplaceRoutes, fivemMarketplaceClientRoutes };

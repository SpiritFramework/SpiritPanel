import type { FastifyInstance } from 'fastify';
import { registerFivemMarketplaceRoutes, adminMarketplaceRoutes } from '../plugins/fivem-marketplace/index.js';

/** @deprecated Import from plugins/fivem-marketplace — thin compatibility shim */
export async function marketplaceRoutes(app: FastifyInstance) {
  await registerFivemMarketplaceRoutes(app);
}

export { adminMarketplaceRoutes };

import type { FastifyInstance } from 'fastify';
import { getAuthFromRequest } from '../lib/auth.js';
import { getStatusPageSettings } from '../lib/panel-settings.js';
import { getStatusNodesPayload } from '../services/status-page.js';

export async function statusRoutes(app: FastifyInstance) {
  app.get('/nodes', async (request, reply) => {
    const settings = await getStatusPageSettings();
    if (!settings.enabled) {
      return reply.status(404).send({ error: 'Not found' });
    }

    if (settings.visibility === 'authenticated') {
      const auth = await getAuthFromRequest(request);
      if (!auth || !auth.user.enabled) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }

    return getStatusNodesPayload(settings.detail);
  });
}

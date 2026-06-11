import type { FastifyRequest } from 'fastify';
import { logAdminActivity } from './admin-activity.js';
import type { ApplicationScope } from './application-scopes.js';

/** Audit trail for Application API key usage — never log secrets. */
export async function logApplicationApiUse(request: FastifyRequest, scope: ApplicationScope): Promise<void> {
  const key = request.applicationApiKey;
  if (!key) return;

  await logAdminActivity(request, {
    event: 'application.api',
    description: `Application API ${request.method} ${request.routeOptions?.url ?? request.url}`,
    properties: {
      keyId: key.id,
      keyIdentifier: key.identifier,
      scope,
    },
  });
}

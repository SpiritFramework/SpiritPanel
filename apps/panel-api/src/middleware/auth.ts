import crypto from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { API_KEY_TYPE_ACCOUNT } from '../lib/api-keys.js';
import { getAuthFromRequest } from '../lib/auth.js';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !auth.user.enabled) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (auth.method === 'api_key' && auth.keyType !== API_KEY_TYPE_ACCOUNT) {
    return reply.status(403).send({ error: 'Account API key required' });
  }
  request.user = auth.user;
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const auth = await getAuthFromRequest(request);
  if (!auth || !auth.user.enabled) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (auth.method !== 'jwt') {
    return reply.status(403).send({ error: 'Session authentication required' });
  }
  request.user = auth.user;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireSession(request, reply);
  if (reply.sent) return;
  if (request.user!.role !== 'admin' && !request.user!.rootAdmin) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
}

export async function requireDaemon(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing daemon credentials' });
  }
  const token = header.slice(7);
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) {
    return reply.status(403).send({ error: 'Invalid daemon credential format' });
  }
  const tokenId = token.slice(0, dotIndex);
  const tokenSecret = token.slice(dotIndex + 1);
  const node = await prisma.node.findFirst({
    where: { daemonTokenId: tokenId },
  });
  if (
    !node ||
    tokenSecret.length !== node.daemonTokenSecret.length ||
    !crypto.timingSafeEqual(Buffer.from(tokenSecret), Buffer.from(node.daemonTokenSecret))
  ) {
    return reply.status(403).send({ error: 'Invalid daemon credentials' });
  }
  request.node = node;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: import('@prisma/client').User;
    node?: import('@prisma/client').Node;
  }
}

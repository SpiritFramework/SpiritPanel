import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { FastifyRequest } from 'fastify';
import { getConfig } from './env.js';
import { assertTokenCritHeaderSupported } from './jwt-crit.js';
import { JWT_HS256_VERIFY } from './jwt-options.js';
import {
  parseAllowedIps,
  parseApplicationPermissions,
  type ApplicationApiKeyContext,
} from './application-scopes.js';
import { prisma } from './prisma.js';
import { getSessionToken } from './session-cookie.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tv?: number;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sessionExpiresIn(role: string): string {
  return role === 'admin' || role === 'staff' ? '24h' : '7d';
}

export function signToken(user: SessionUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, tv: user.tokenVersion },
    getConfig().jwtSecret,
    { algorithm: 'HS256', expiresIn: sessionExpiresIn(user.role) } as jwt.SignOptions,
  );
}

export function verifyToken(token: string): JwtPayload {
  assertTokenCritHeaderSupported(token);
  return jwt.verify(token, getConfig().jwtSecret, JWT_HS256_VERIFY) as JwtPayload;
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

export async function verifyApiKey(identifier: string, token: string) {
  const result = await verifyApiKeyDetailed(identifier, token);
  return result?.user ?? null;
}

export interface VerifiedApiKey {
  user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
  keyType: number;
  keyId: string;
  applicationKey?: ApplicationApiKeyContext;
}

export async function verifyApiKeyDetailed(
  identifier: string,
  token: string,
): Promise<VerifiedApiKey | null> {
  const key = await prisma.apiKey.findUnique({ where: { identifier } });
  if (!key) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  const valid = await bcrypt.compare(token, key.token);
  if (!valid) return null;
  void prisma.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});
  const user = await prisma.user.findUnique({ where: { id: key.userId } });
  if (!user) return null;

  const applicationKey: ApplicationApiKeyContext = {
    id: key.id,
    identifier: key.identifier,
    permissions: parseApplicationPermissions(key.permissions),
    allowedIps: parseAllowedIps(key.allowedIps),
  };

  return {
    user,
    keyType: key.keyType,
    keyId: key.id,
    applicationKey,
  };
}

async function verifySessionJwt(bearer: string) {
  try {
    const payload = verifyToken(bearer);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.enabled) return null;
    if (user.tokenVersion !== (payload.tv ?? 0)) return null;
    return { user, method: 'jwt' as const };
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(
  request: FastifyRequest,
): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
  method: 'jwt' | 'api_key';
  keyType?: number;
  applicationKey?: ApplicationApiKeyContext;
} | null> {
  const header = request.headers.authorization;
  let bearer: string | null = null;

  if (header?.startsWith('Bearer ')) {
    bearer = header.slice(7);
  } else {
    bearer = getSessionToken(request);
  }

  if (!bearer) return null;

  const dotIndex = bearer.indexOf('.');
  if (dotIndex > 0 && bearer.startsWith('sp_')) {
    const identifier = bearer.slice(0, dotIndex);
    const secret = bearer.slice(dotIndex + 1);
    const result = await verifyApiKeyDetailed(identifier, secret);
    if (!result) return null;
    return {
      user: result.user,
      method: 'api_key',
      keyType: result.keyType,
      applicationKey: result.applicationKey,
    };
  }

  return verifySessionJwt(bearer);
}

export async function getUserFromRequest(request: FastifyRequest) {
  const auth = await getAuthFromRequest(request);
  return auth?.user ?? null;
}

export function signWingsJwt(
  claims: Record<string, unknown>,
  expiresIn: string | number = '10m',
  /** FeatherWings verifies console JWTs with the node daemon token secret. */
  secret: string,
): string {
  if (!secret?.trim()) {
    throw new Error('Daemon token secret is required to sign FeatherWings JWTs');
  }
  return jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn } as jwt.SignOptions);
}

export async function hashApiToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export function generateApiIdentifier(): string {
  return `sp_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function generateApiToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

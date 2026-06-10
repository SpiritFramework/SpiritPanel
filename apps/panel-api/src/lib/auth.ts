import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { FastifyRequest } from 'fastify';
import { getConfig } from './env.js';
import { prisma } from './prisma.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getConfig().jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getConfig().jwtSecret) as JwtPayload;
}

export async function verifyApiKey(identifier: string, token: string) {
  const result = await verifyApiKeyDetailed(identifier, token);
  return result?.user ?? null;
}

export async function verifyApiKeyDetailed(identifier: string, token: string) {
  const key = await prisma.apiKey.findUnique({ where: { identifier } });
  if (!key) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  const valid = await bcrypt.compare(token, key.token);
  if (!valid) return null;
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  const user = await prisma.user.findUnique({ where: { id: key.userId } });
  if (!user) return null;
  return { user, keyType: key.keyType };
}

export async function getAuthFromRequest(
  request: FastifyRequest,
): Promise<{ user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>; method: 'jwt' | 'api_key'; keyType?: number } | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const bearer = header.slice(7);

  const dotIndex = bearer.indexOf('.');
  if (dotIndex > 0 && bearer.startsWith('sp_')) {
    const identifier = bearer.slice(0, dotIndex);
    const secret = bearer.slice(dotIndex + 1);
    const result = await verifyApiKeyDetailed(identifier, secret);
    if (!result) return null;
    return { user: result.user, method: 'api_key', keyType: result.keyType };
  }

  try {
    const payload = verifyToken(bearer);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    return { user, method: 'jwt' };
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: FastifyRequest) {
  const auth = await getAuthFromRequest(request);
  return auth?.user ?? null;
}

export function signWingsJwt(
  claims: Record<string, unknown>,
  expiresIn: string | number = '10m',
  /** FeatherWings verifies console JWTs with the node daemon token secret. */
  secret?: string,
): string {
  const key = secret ?? getConfig().appKey.replace('base64:', '');
  return jwt.sign(claims, key, { expiresIn } as jwt.SignOptions);
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

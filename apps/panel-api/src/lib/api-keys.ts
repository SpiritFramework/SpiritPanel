import { prisma } from './prisma.js';
import { generateApiIdentifier, generateApiToken, hashApiToken } from './auth.js';
import {
  APPLICATION_SCOPE_ALL,
  normalizeApplicationPermissions,
} from './application-scopes.js';

export const API_KEY_TYPE_ACCOUNT = 1;
export const API_KEY_TYPE_APPLICATION = 2;

const APPLICATION_KEY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const apiKeySelect = {
  id: true,
  identifier: true,
  memo: true,
  keyType: true,
  permissions: true,
  allowedIps: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

export async function listApiKeysForUser(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: apiKeySelect,
  });
}

export async function createApiKeyForUser(
  userId: string,
  data: {
    memo: string;
    keyType: number;
    permissions?: string[] | null;
    allowedIps?: string[] | null;
  },
) {
  if (data.keyType === API_KEY_TYPE_APPLICATION && !data.memo.trim()) {
    throw Object.assign(new Error('Application API keys require a memo describing their use'), {
      statusCode: 422,
    });
  }

  const identifier = generateApiIdentifier();
  const token = generateApiToken();
  const expiresAt =
    data.keyType === API_KEY_TYPE_APPLICATION
      ? new Date(Date.now() + APPLICATION_KEY_TTL_MS)
      : null;

  // Omitted permissions → store full scopes explicitly. null/[] stay empty (deny at auth).
  const permissions =
    data.keyType === API_KEY_TYPE_APPLICATION
      ? normalizeApplicationPermissions(
          data.permissions === undefined ? [APPLICATION_SCOPE_ALL] : data.permissions,
        )
      : null;

  const allowedIps =
    data.allowedIps && data.allowedIps.length > 0
      ? data.allowedIps.map((ip) => ip.trim()).filter(Boolean)
      : null;

  const key = await prisma.apiKey.create({
    data: {
      userId,
      identifier,
      token: await hashApiToken(token),
      memo: data.memo.trim(),
      keyType: data.keyType,
      expiresAt,
      permissions: permissions ?? undefined,
      allowedIps: allowedIps ?? undefined,
    },
    select: apiKeySelect,
  });

  return { ...key, token };
}

export async function deleteApiKeyForUser(keyId: string, userId: string) {
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) return false;
  await prisma.apiKey.delete({ where: { id: keyId } });
  return true;
}

export async function deleteApiKeyById(keyId: string) {
  const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!key) return false;
  await prisma.apiKey.delete({ where: { id: keyId } });
  return true;
}

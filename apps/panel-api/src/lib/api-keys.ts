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

  // Application keys must declare scopes explicitly — never default to full access.
  // null/[] normalize to empty and are denied at auth.
  let permissions: string[] | null = null;
  if (data.keyType === API_KEY_TYPE_APPLICATION) {
    if (data.permissions === undefined) {
      throw Object.assign(
        new Error('Application API keys require an explicit permissions array'),
        { statusCode: 422 },
      );
    }
    permissions = normalizeApplicationPermissions(data.permissions);
    if (!permissions || permissions.length === 0) {
      throw Object.assign(
        new Error('Application API keys require at least one permission scope'),
        { statusCode: 422 },
      );
    }
  }

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

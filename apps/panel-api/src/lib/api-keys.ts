import { prisma } from './prisma.js';
import { generateApiIdentifier, generateApiToken, hashApiToken } from './auth.js';

export const API_KEY_TYPE_ACCOUNT = 1;
export const API_KEY_TYPE_APPLICATION = 2;

const apiKeySelect = {
  id: true,
  identifier: true,
  memo: true,
  keyType: true,
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
  data: { memo: string; keyType: number },
) {
  const identifier = generateApiIdentifier();
  const token = generateApiToken();

  const key = await prisma.apiKey.create({
    data: {
      userId,
      identifier,
      token: await hashApiToken(token),
      memo: data.memo,
      keyType: data.keyType,
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

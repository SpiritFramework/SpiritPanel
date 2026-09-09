import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { getConfig } from './env.js';

const ALGO = 'aes-256-gcm';
const LEGACY_SALT = 'spirit-panel-secrets';
const V2_PREFIX = 'v2:';

/**
 * Encrypted secret formats:
 * - legacy: `ivB64.tagB64.dataB64` — key derived with fixed salt `spirit-panel-secrets`
 * - v2:     `v2:saltB64.ivB64.tagB64.dataB64` — per-secret random salt (preferred)
 *
 * decryptSecret accepts both; encryptSecret always writes v2.
 */

function appSecretMaterial(): string {
  return getConfig().appKey.replace(/^base64:/, '');
}

function deriveKey(salt: string | Buffer): Buffer {
  return scryptSync(appSecretMaterial(), salt, 32);
}

export function encryptSecret(plain: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(salt), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    V2_PREFIX + salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export function decryptSecret(payload: string): string {
  if (payload.startsWith(V2_PREFIX)) {
    const withoutPrefix = payload.slice(V2_PREFIX.length);
    const [saltB64, ivB64, tagB64, dataB64] = withoutPrefix.split('.');
    if (!saltB64 || !ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid encrypted secret format');
    }
    return decryptWithKey(
      deriveKey(Buffer.from(saltB64, 'base64')),
      ivB64,
      tagB64,
      dataB64,
    );
  }

  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format');
  }
  return decryptWithKey(deriveKey(LEGACY_SALT), ivB64, tagB64, dataB64);
}

function decryptWithKey(key: Buffer, ivB64: string, tagB64: string, dataB64: string): string {
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

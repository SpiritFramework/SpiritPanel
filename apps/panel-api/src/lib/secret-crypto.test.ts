import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Ensure getConfig() can load before secret-crypto is exercised.
process.env.DATABASE_URL ??= 'mysql://user:pass@127.0.0.1:3306/spirit_panel_test';
process.env.JWT_SECRET ??= 'test-jwt-secret-for-secret-crypto-unit-tests';
process.env.APP_KEY ??= 'test-app-key-for-secret-crypto-unit-tests';
process.env.NODE_ENV ??= 'test';

const { encryptSecret, decryptSecret } = await import('./secret-crypto.js');
const { createCipheriv, randomBytes, scryptSync } = await import('node:crypto');
const { getConfig } = await import('./env.js');

describe('secret-crypto', () => {
  it('encrypts with v2 random-salt format and decrypts round-trip', () => {
    const plain = 'db-password-super-secret';
    const sealed = encryptSecret(plain);
    assert.ok(sealed.startsWith('v2:'));
    assert.equal(decryptSecret(sealed), plain);
  });

  it('still decrypts legacy fixed-salt ciphertext', () => {
    const plain = 'legacy-secret-value';
    const secret = getConfig().appKey.replace(/^base64:/, '');
    const key = scryptSync(secret, 'spirit-panel-secrets', 32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const legacy = `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
    assert.equal(decryptSecret(legacy), plain);
  });

  it('rejects malformed payloads', () => {
    assert.throws(() => decryptSecret('not-valid'), /Invalid encrypted secret format/);
    assert.throws(() => decryptSecret('v2:only.two'), /Invalid encrypted secret format/);
  });
});

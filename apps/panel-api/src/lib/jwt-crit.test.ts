import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { assertTokenCritHeaderSupported } from './jwt-crit.js';

function signWithCrit(crit: string[], extraHeader: Record<string, unknown> = {}) {
  return jwt.sign(
    { sub: 'user', role: 'admin' },
    'test-secret',
    {
      algorithm: 'HS256',
      header: { alg: 'HS256', typ: 'JWT', crit, ...extraHeader },
    } as jwt.SignOptions,
  );
}

describe('jwt crit header validation', () => {
  it('allows tokens without crit', () => {
    const token = jwt.sign({ sub: 'user' }, 'test-secret', { algorithm: 'HS256' } as jwt.SignOptions);
    assert.doesNotThrow(() => assertTokenCritHeaderSupported(token));
  });

  it('rejects unknown critical extensions', () => {
    const token = signWithCrit(['x-custom-policy'], { 'x-custom-policy': 'require-mfa' });
    assert.throws(
      () => assertTokenCritHeaderSupported(token),
      (err: unknown) =>
        err instanceof jwt.JsonWebTokenError &&
        (err as jwt.JsonWebTokenError).message.includes('Unsupported critical extension'),
    );
  });

  it('rejects empty crit array', () => {
    const token = signWithCrit([]);
    assert.throws(
      () => assertTokenCritHeaderSupported(token),
      (err: unknown) =>
        err instanceof jwt.JsonWebTokenError &&
        (err as jwt.JsonWebTokenError).message.includes('non-empty array'),
    );
  });

  it('rejects standard header names in crit', () => {
    const token = signWithCrit(['alg']);
    assert.throws(
      () => assertTokenCritHeaderSupported(token),
      (err: unknown) =>
        err instanceof jwt.JsonWebTokenError &&
        (err as jwt.JsonWebTokenError).message.includes('standard header parameter'),
    );
  });
});

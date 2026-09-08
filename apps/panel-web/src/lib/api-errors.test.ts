import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeClientError, shouldTreat401AsSessionExpired } from './api-errors.js';

describe('sanitizeClientError', () => {
  it('passes through safe login failure messages on 401', () => {
    assert.equal(sanitizeClientError(401, 'Invalid credentials'), 'Invalid credentials');
  });

  it('passes through safe permission messages on 403', () => {
    assert.equal(
      sanitizeClientError(403, 'Current password is incorrect'),
      'Current password is incorrect',
    );
  });

  it('uses session-expired fallback for 401 without a server message', () => {
    assert.equal(
      sanitizeClientError(401),
      'Your session has expired. Please sign in again.',
    );
  });

  it('uses permission fallback for 403 without a server message', () => {
    assert.equal(
      sanitizeClientError(403),
      "You don't have permission to perform this action.",
    );
  });

  it('hides unsafe internal errors', () => {
    assert.equal(
      sanitizeClientError(500, 'PrismaClientKnownRequestError at foo()'),
      'Something went wrong on our end. Please try again.',
    );
  });

  it('passes through safe turnstile and rate-limit messages', () => {
    assert.equal(
      sanitizeClientError(400, 'Please complete the security check.'),
      'Please complete the security check.',
    );
    assert.equal(
      sanitizeClientError(429, 'Too many attempts. Try again in 15 minutes.'),
      'Too many attempts. Try again in 15 minutes.',
    );
  });
});

describe('shouldTreat401AsSessionExpired', () => {
  it('returns false for login and registration paths', () => {
    assert.equal(shouldTreat401AsSessionExpired('/auth/login'), false);
    assert.equal(shouldTreat401AsSessionExpired('/auth/login/2fa'), false);
    assert.equal(shouldTreat401AsSessionExpired('/auth/register'), false);
    assert.equal(shouldTreat401AsSessionExpired('/auth/forgot-password'), false);
    assert.equal(shouldTreat401AsSessionExpired('/auth/reset-password'), false);
  });

  it('returns true for authenticated API paths', () => {
    assert.equal(shouldTreat401AsSessionExpired('/auth/me'), true);
    assert.equal(shouldTreat401AsSessionExpired('/client/servers'), true);
  });
});

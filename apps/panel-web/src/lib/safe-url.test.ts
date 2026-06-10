import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeImageSrc, sanitizeLinkHref } from './safe-url';

describe('safe-url (web)', () => {
  it('blocks javascript URLs in links and images', () => {
    assert.equal(sanitizeLinkHref('javascript:alert(1)'), null);
    assert.equal(sanitizeImageSrc('javascript:alert(1)'), null);
  });

  it('allows safe panel branding paths', () => {
    assert.equal(sanitizeImageSrc('/api/auth/branding/assets/logo.png'), '/api/auth/branding/assets/logo.png');
  });
});

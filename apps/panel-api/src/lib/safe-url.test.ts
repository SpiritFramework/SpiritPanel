import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSafeHttpUrl,
  isSafeHttpUrl,
  isSafeImageSrc,
  sanitizeImageSrc,
  sanitizeLinkHref,
} from './safe-url.js';

describe('safe-url', () => {
  it('accepts https URLs', () => {
    assert.equal(isSafeHttpUrl('https://cdn.example.com/logo.png'), true);
  });

  it('rejects javascript URLs', () => {
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
    assert.equal(sanitizeLinkHref('javascript:alert(1)'), null);
  });

  it('rejects data URLs for links', () => {
    assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  });

  it('allows panel asset paths for images', () => {
    assert.equal(isSafeImageSrc('/api/auth/branding/assets/logo.png'), true);
    assert.equal(sanitizeImageSrc('/api/auth/branding/assets/logo.png'), '/api/auth/branding/assets/logo.png');
  });

  it('rejects protocol-relative and unsafe image sources', () => {
    assert.equal(isSafeImageSrc('//evil.example/x'), false);
    assert.equal(sanitizeImageSrc('javascript:void(0)'), null);
  });

  it('assertSafeHttpUrl throws for invalid input', () => {
    assert.throws(() => assertSafeHttpUrl('javascript:alert(1)'), /http or https/);
  });
});

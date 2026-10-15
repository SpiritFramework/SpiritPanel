import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertPublicDatabaseHost, isUnsafeGameQueryHost } from './network-guard.js';

describe('network-guard IPv4-mapped IPv6', () => {
  it('rejects IPv4-mapped loopback and link-local as database hosts', () => {
    assert.throws(() => assertPublicDatabaseHost('::ffff:127.0.0.1'), /not allowed/);
    assert.throws(() => assertPublicDatabaseHost('::ffff:169.254.169.254'), /not allowed/);
    assert.throws(() => assertPublicDatabaseHost('::ffff:7f00:1'), /not allowed/);
  });

  it('still allows public IPv4-mapped addresses', () => {
    assert.doesNotThrow(() => assertPublicDatabaseHost('::ffff:8.8.8.8'));
  });
});

describe('isUnsafeGameQueryHost', () => {
  it('blocks loopback, link-local, and metadata names', () => {
    assert.equal(isUnsafeGameQueryHost('127.0.0.1'), true);
    assert.equal(isUnsafeGameQueryHost('::1'), true);
    assert.equal(isUnsafeGameQueryHost('::ffff:127.0.0.1'), true);
    assert.equal(isUnsafeGameQueryHost('169.254.169.254'), true);
    assert.equal(isUnsafeGameQueryHost('localhost'), true);
    assert.equal(isUnsafeGameQueryHost('metadata.google.internal'), true);
  });

  it('allows RFC1918 and public game hosts', () => {
    assert.equal(isUnsafeGameQueryHost('10.0.0.5'), false);
    assert.equal(isUnsafeGameQueryHost('192.168.1.40'), false);
    assert.equal(isUnsafeGameQueryHost('203.0.113.10'), false);
    assert.equal(isUnsafeGameQueryHost('play.example.com'), false);
  });
});

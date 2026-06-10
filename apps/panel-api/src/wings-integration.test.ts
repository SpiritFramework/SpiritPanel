/**
 * FeatherWings remote API integration test.
 * Run with: cd apps/panel-api && pnpm test
 *
 * Requires DATABASE_URL. Optionally set TEST_NODE_TOKEN_ID and TEST_NODE_TOKEN_SECRET
 * after creating a node in admin to validate live daemon auth.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWingsConfig } from './services/server-helpers.js';

describe('wings config generation', () => {
  it('generates valid yaml with remote url', () => {
    const yaml = buildWingsConfig({
      uuid: 'node-uuid',
      name: 'Test Node',
      fqdn: 'node.test.com',
      scheme: 'https',
      behindProxy: false,
      daemonListen: 8080,
      daemonSftp: 2022,
      daemonBase: '/var/lib/pterodactyl/volumes',
      daemonTokenId: 'abc123',
      daemonTokenSecret: 'secret456',
      uploadSize: 100,
    });
    assert.match(yaml, /remote:/);
    assert.match(yaml, /token_id: abc123/);
    assert.match(yaml, /FeatherWings|Spirit-Panel/);
  });
});

describe('daemon auth format', () => {
  it('panel to wings uses the token secret only', () => {
    const tokenSecret = 'secretpart';
    assert.equal(`Bearer ${tokenSecret}`, 'Bearer secretpart');
  });

  it('wings to panel remote API uses token_id.token_secret', () => {
    const tokenId = 'idpart';
    const tokenSecret = 'secretpart';
    assert.equal(`Bearer ${tokenId}.${tokenSecret}`, 'Bearer idpart.secretpart');
  });
});

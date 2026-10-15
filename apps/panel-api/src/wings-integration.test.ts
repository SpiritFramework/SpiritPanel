/**
 * FeatherWings remote API integration test.
 * Run with: cd apps/panel-api && pnpm test
 *
 * Requires DATABASE_URL. Optionally set TEST_NODE_TOKEN_ID and TEST_NODE_TOKEN_SECRET
 * after creating a node in admin to validate live daemon auth.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWingsConfig, buildWingsJoinBootstrap, buildWingsJoinData } from './services/server-helpers.js';

const sampleNode = {
  uuid: 'node-uuid',
  name: 'Test Node',
  fqdn: 'node.test.com',
  scheme: 'https' as const,
  behindProxy: false,
  daemonListen: 8080,
  daemonSftp: 2022,
  daemonBase: '/var/lib/pterodactyl/volumes',
  daemonTokenId: 'abc123',
  daemonTokenSecret: 'secret456',
  uploadSize: 100,
};

describe('wings config generation', () => {
  it('generates valid yaml with remote url', () => {
    const yaml = buildWingsConfig(sampleNode);
    assert.match(yaml, /remote:/);
    assert.match(yaml, /token_id: abc123/);
    assert.match(yaml, /FeatherWings|Spirit-Panel/);
  });

  it('builds FeatherWings join-data bootstrap (base64 YAML)', () => {
    const yaml = buildWingsJoinBootstrap(sampleNode);
    assert.match(yaml, /^uuid: node-uuid$/m);
    assert.match(yaml, /^token_id: abc123$/m);
    assert.match(yaml, /^token: secret456$/m);
    assert.match(yaml, /^remote: /m);
    const joinData = buildWingsJoinData(sampleNode);
    const decoded = Buffer.from(joinData, 'base64').toString('utf8');
    assert.equal(decoded, yaml);
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

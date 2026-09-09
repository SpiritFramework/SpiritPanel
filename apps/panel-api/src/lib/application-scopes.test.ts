import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLICATION_SCOPES,
  APPLICATION_SCOPE_ALL,
  applicationKeyHasScope,
  normalizeApplicationPermissions,
  type ApplicationApiKeyContext,
} from './application-scopes.js';

function key(permissions: string[] | null): ApplicationApiKeyContext {
  return { id: 'k1', identifier: 'sp_test', permissions, allowedIps: null };
}

describe('application scopes', () => {
  it('denies when permissions are null (legacy full-access rows)', () => {
    assert.equal(applicationKeyHasScope(key(null), 'users.read'), false);
  });

  it('denies when permissions are empty', () => {
    assert.equal(applicationKeyHasScope(key([]), 'servers.read'), false);
  });

  it('allows an explicitly granted scope', () => {
    assert.equal(applicationKeyHasScope(key(['users.read']), 'users.read'), true);
    assert.equal(applicationKeyHasScope(key(['users.read']), 'users.write'), false);
  });

  it('allows all scopes when application.* is present', () => {
    assert.equal(applicationKeyHasScope(key([APPLICATION_SCOPE_ALL]), 'servers.delete'), true);
  });

  it('normalize empty/null returns no scopes (fail closed)', () => {
    assert.deepEqual(normalizeApplicationPermissions(null), []);
    assert.deepEqual(normalizeApplicationPermissions(undefined), []);
    assert.deepEqual(normalizeApplicationPermissions([]), []);
  });

  it('normalize expands application.* to the full scope list', () => {
    assert.deepEqual(normalizeApplicationPermissions([APPLICATION_SCOPE_ALL]), [...APPLICATION_SCOPES]);
  });

  it('normalize rejects unknown scopes', () => {
    assert.throws(() => normalizeApplicationPermissions(['not.a.scope']), /Invalid application API scopes/);
  });
});

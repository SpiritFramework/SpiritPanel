import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveColocatedBackupFile } from './local-backup-path.js';

describe('resolveColocatedBackupFile', () => {
  it('rejects non-UUID server or backup ids', () => {
    assert.equal(resolveColocatedBackupFile('../etc', '11111111-1111-4111-8111-111111111111'), null);
    assert.equal(resolveColocatedBackupFile('11111111-1111-4111-8111-111111111111', '../etc'), null);
    assert.equal(resolveColocatedBackupFile('not-a-uuid', 'also-not'), null);
  });
});

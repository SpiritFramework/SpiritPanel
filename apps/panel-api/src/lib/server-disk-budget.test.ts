import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sumBackupBytesTowardDisk } from './server-disk-budget.js';

describe('sumBackupBytesTowardDisk', () => {
  it('sums completed archive sizes', () => {
    const total = sumBackupBytesTowardDisk(
      [
        { bytes: 1000n, completedAt: new Date() },
        { bytes: 2500n, completedAt: new Date() },
      ],
      9999,
    );
    assert.equal(total, 3500);
  });

  it('reserves estimate for in-progress backups with zero bytes', () => {
    const total = sumBackupBytesTowardDisk(
      [
        { bytes: 1000n, completedAt: new Date() },
        { bytes: 0n, completedAt: null },
      ],
      4000,
    );
    assert.equal(total, 5000);
  });

  it('ignores failed completed backups with zero bytes', () => {
    const total = sumBackupBytesTowardDisk(
      [{ bytes: 0n, completedAt: new Date() }],
      4000,
    );
    assert.equal(total, 0);
  });
});

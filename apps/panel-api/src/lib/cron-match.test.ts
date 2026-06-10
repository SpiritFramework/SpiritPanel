import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cronMatchesNow } from './cron-match.js';

describe('cronMatchesNow', () => {
  it('matches every minute', () => {
    const date = new Date('2026-06-08T14:37:00Z');
    assert.equal(cronMatchesNow('* * * * *', date), true);
  });

  it('matches step values', () => {
    const date = new Date('2026-06-08T14:30:00Z');
    assert.equal(cronMatchesNow('*/15 * * * *', date), true);
    assert.equal(cronMatchesNow('*/15 * * * *', new Date('2026-06-08T14:07:00Z')), false);
  });

  it('matches ranges and lists', () => {
    const date = new Date('2026-06-08T09:15:00Z');
    assert.equal(cronMatchesNow('15 9 * * *', date), true);
    assert.equal(cronMatchesNow('10,15,20 9 * * *', date), true);
    assert.equal(cronMatchesNow('10-20 9 * * *', date), true);
  });
});

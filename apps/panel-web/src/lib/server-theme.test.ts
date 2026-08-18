import test from 'node:test';
import assert from 'node:assert/strict';
import { formatResource, formatResourceAmount } from './server-theme';

test('formatResource uses unlimited label for zero limits', () => {
  assert.equal(formatResource(0, 'MiB'), 'Unlimited');
  assert.equal(formatResource(0, 'MiB', { unlimitedLabel: '0 MiB' }), '0 MiB');
});

test('formatResourceAmount shows zero for empty usage', () => {
  assert.equal(formatResourceAmount(0, 'MiB'), '0 MiB');
  assert.equal(formatResourceAmount(1024, 'MiB'), '1 GiB');
});

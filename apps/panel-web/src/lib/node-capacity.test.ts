import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCapacityLabel, formatFreeLabel } from './node-capacity';

test('formatCapacityLabel does not show unlimited for zero allocation with a limit', () => {
  assert.equal(formatCapacityLabel(0, 16384), '0 MiB / 16 GiB');
  assert.equal(formatCapacityLabel(512, 16384), '512 MiB / 16 GiB');
});

test('formatCapacityLabel shows allocated amount when node has no limit', () => {
  assert.equal(formatCapacityLabel(0, 0), '0 MiB allocated');
  assert.equal(formatCapacityLabel(1024, 0), '1 GiB allocated');
});

test('formatFreeLabel shows zero free correctly', () => {
  assert.equal(formatFreeLabel(0), '0 MiB free');
  assert.equal(formatFreeLabel(4096), '4 GiB free');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersionStatus, compareVersions, parseVersionSegments } from './version-compare.js';

test('parseVersionSegments strips v-prefix and non-numeric tails', () => {
  assert.deepEqual(parseVersionSegments('v1.3.7.6'), [1, 3, 7, 6]);
  assert.deepEqual(parseVersionSegments('1.3.7-rc1'), [1, 3, 7, 0]);
});

test('compareVersions orders featherwings tags', () => {
  assert.ok(compareVersions('1.3.7.6', '1.3.7.5') > 0);
  assert.ok(compareVersions('v1.3.7.6', '1.3.7.6') === 0);
  assert.ok(compareVersions('1.3.6', '1.3.7.6') < 0);
});

test('compareVersionStatus', () => {
  assert.equal(compareVersionStatus('1.3.7.6', '1.3.7.6'), 'current');
  assert.equal(compareVersionStatus('1.3.7.5', '1.3.7.6'), 'behind');
  assert.equal(compareVersionStatus('1.3.8', '1.3.7.6'), 'ahead');
  assert.equal(compareVersionStatus(null, '1.3.7.6'), 'unknown');
});

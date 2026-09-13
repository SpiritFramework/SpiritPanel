import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_WATCHES } from './alerts.js';

test('default watches cover servers, security, and nodes', () => {
  assert.equal(DEFAULT_WATCHES.server_crashed.thresholdPct, 0);
  assert.ok(DEFAULT_WATCHES.disk.thresholdPct >= 80);
  assert.ok(DEFAULT_WATCHES.cpu.thresholdPct >= 80);
  assert.ok(DEFAULT_WATCHES.account_login_failed.cooldownSec >= 60);
  assert.ok(DEFAULT_WATCHES.node_offline.cooldownSec >= 60);
});

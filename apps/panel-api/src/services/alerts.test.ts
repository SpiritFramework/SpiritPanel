import assert from 'node:assert/strict';
import test from 'node:test';
import { ALERT_PRESETS } from '../services/alerts.js';

test('alert presets cover essential lifecycle + resources', () => {
  assert.ok(ALERT_PRESETS.essential.rules.some((r) => r.metric === 'server_crashed'));
  assert.ok(ALERT_PRESETS.essential.rules.some((r) => r.metric === 'disk'));
  assert.ok(ALERT_PRESETS.performance.rules.every((r) => r.metric === 'cpu' || r.metric === 'memory'));
  assert.equal(ALERT_PRESETS.node_health.adminOnly, true);
  assert.ok(ALERT_PRESETS.full.rules.length >= 5);
});

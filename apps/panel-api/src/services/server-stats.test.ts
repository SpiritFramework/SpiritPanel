import assert from 'node:assert/strict';
import { normalizeWingsStatsSnapshot } from './server-stats.js';

const nestedRunning = {
  state: 'running',
  utilization: {
    cpu_absolute: 12.5,
    memory_bytes: 512_000_000,
    disk_bytes: 2_000_000_000,
    network: { rx_bytes: 1_000_000, tx_bytes: 500_000 },
    uptime: 60_000,
  },
};

assert.equal(normalizeWingsStatsSnapshot(nestedRunning).cpu, 12.5);
assert.equal(normalizeWingsStatsSnapshot(nestedRunning).memoryBytes, 512_000_000);
assert.equal(normalizeWingsStatsSnapshot(nestedRunning).networkRxBytes, 1_000_000);
assert.equal(normalizeWingsStatsSnapshot(nestedRunning).state, 'running');

const nestedOffline = {
  state: 'offline',
  utilization: { cpu_absolute: 99, memory_bytes: 999, network: { rx_bytes: 1, tx_bytes: 2 } },
};

assert.equal(normalizeWingsStatsSnapshot(nestedOffline).cpu, 0);
assert.equal(normalizeWingsStatsSnapshot(nestedOffline).memoryBytes, 0);
assert.equal(normalizeWingsStatsSnapshot(nestedOffline).networkRxBytes, 0);
assert.equal(normalizeWingsStatsSnapshot(nestedOffline).state, 'offline');

console.log('server-stats.test.ts passed');

import assert from 'node:assert/strict';
import { inferStateFromWingsResources, parseWingsResourcesPayload } from './wings-resources.js';

assert.equal(parseWingsResourcesPayload({ state: 'running', uptime: 42 }).state, 'running');
assert.equal(parseWingsResourcesPayload({ state: 'running', uptime: 42 }).uptime, 42);

const nested = parseWingsResourcesPayload({
  attributes: { current_state: 'starting', memory_bytes: 1_000_000 },
});
assert.equal(nested.state, 'starting');
assert.equal(nested.memory_bytes, 1_000_000);

assert.equal(inferStateFromWingsResources({ resources: { state: 'running' } }), 'running');
assert.equal(inferStateFromWingsResources({ utilization: { uptime: 10 } }), 'running');
assert.equal(inferStateFromWingsResources({ memory_bytes: 100 }), 'offline');

assert.equal(
  inferStateFromWingsResources({
    state: 'running',
    utilization: { memory_bytes: 1_500_000, uptime: 12_000, cpu_absolute: 1.2 },
  }),
  'running',
);

assert.equal(
  inferStateFromWingsResources({
    state: 'starting',
    utilization: { memory_bytes: 0, uptime: 0 },
  }),
  'starting',
);

assert.equal(
  parseWingsResourcesPayload({
    state: 'running',
    utilization: { state: 'starting', memory_bytes: 2_000_000, uptime: 5000 },
  }).state,
  'running',
);

assert.equal(
  inferStateFromWingsResources({
    state: 'running',
    utilization: { state: 'starting', memory_bytes: 2_000_000, uptime: 5000 },
  }),
  'running',
);

assert.equal(
  inferStateFromWingsResources({
    utilization: { state: 'starting', memory_bytes: 2_000_000, uptime: 5000 },
  }),
  'running',
);

console.log('wings-resources.test.ts passed');

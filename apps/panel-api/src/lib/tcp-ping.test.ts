import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTcpPingSamples } from './tcp-ping.js';

describe('aggregateTcpPingSamples', () => {
  it('returns null for no samples', () => {
    assert.equal(aggregateTcpPingSamples([]), null);
  });

  it('returns the minimum sample', () => {
    assert.equal(aggregateTcpPingSamples([48, 24, 31]), 24);
  });

  it('handles a single sample', () => {
    assert.equal(aggregateTcpPingSamples([17]), 17);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { smoothPingReading } from './ping-smooth.js';

describe('smoothPingReading', () => {
  it('uses the first sample as-is', () => {
    assert.equal(smoothPingReading(null, 24), 24);
  });

  it('damps a sudden spike', () => {
    assert.equal(smoothPingReading(24, 280), 152);
  });

  it('tracks downward moves', () => {
    assert.equal(smoothPingReading(80, 30), 55);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsSeries, type StatSeriesPoint } from './stats.js';

function point(offsetMs: number, cpu: number): StatSeriesPoint {
  return {
    recordedAt: new Date(Date.now() + offsetMs).toISOString(),
    cpu,
    memoryBytes: 0,
    diskBytes: 0,
    networkRxBytes: 0,
    networkTxBytes: 0,
    state: 'running',
  };
}

describe('buildAnalyticsSeries', () => {
  it('appends live without overwriting last historical point', () => {
    const historical = [point(-60 * 60_000, 2.6)];
    const live = point(-30 * 60_000, 9.1);
    const series = buildAnalyticsSeries(historical, live, '24h', 72);
    assert.equal(series.length, 2);
    assert.equal(series[0].cpu, 2.6);
    assert.equal(series[1].cpu, 9.1);
  });

  it('does not append live older than last historical point', () => {
    const historical = [point(-60 * 60_000, 1), point(-30 * 60_000, 9.1)];
    const live = point(-45 * 60_000, 2.6);
    const series = buildAnalyticsSeries(historical, live, '24h', 72);
    assert.equal(series.length, 2);
    assert.equal(series[1].cpu, 9.1);
  });

  it('uses bucket end timestamps when downsampling', () => {
    const historical = [
      point(-4 * 60 * 60_000, 1),
      point(-3 * 60 * 60_000, 2),
      point(-2 * 60 * 60_000, 3),
      point(-1 * 60 * 60_000, 4),
    ];
    const series = buildAnalyticsSeries(historical, null, '24h', 2);
    assert.equal(series.length, 2);
    assert.equal(series[0].recordedAt, historical[1].recordedAt);
    assert.equal(series[1].recordedAt, historical[3].recordedAt);
  });
});

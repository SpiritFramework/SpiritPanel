import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapWithConcurrency } from './map-concurrency.js';
import { parseRefreshQuery } from './refresh-query.js';

describe('mapWithConcurrency', () => {
  it('preserves order with limited parallelism', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapWithConcurrency(items, 2, async (n) => n * 2);
    assert.deepEqual(results, [2, 4, 6, 8, 10]);
  });

  it('returns an empty array for no items', async () => {
    assert.deepEqual(await mapWithConcurrency([], 4, async (n) => n), []);
  });
});

describe('parseRefreshQuery', () => {
  it('accepts refresh=true and refresh=1', () => {
    assert.equal(parseRefreshQuery({ refresh: 'true' }), true);
    assert.equal(parseRefreshQuery({ refresh: '1' }), true);
  });

  it('defaults to false', () => {
    assert.equal(parseRefreshQuery({}), false);
    assert.equal(parseRefreshQuery({ refresh: 'false' }), false);
    assert.equal(parseRefreshQuery(undefined), false);
  });
});

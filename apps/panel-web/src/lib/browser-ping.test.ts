import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { aggregateBrowserPingSamples, browserSafeProbeUrl } from './browser-ping';

describe('aggregateBrowserPingSamples', () => {
  test('returns null for empty', () => {
    assert.equal(aggregateBrowserPingSamples([]), null);
  });

  test('returns minimum sample', () => {
    assert.equal(aggregateBrowserPingSamples([48, 24, 31]), 24);
  });
});

describe('browserSafeProbeUrl', () => {
  test('leaves https probes alone', () => {
    assert.equal(browserSafeProbeUrl('https://node.example:8080/'), 'https://node.example:8080/');
  });
});

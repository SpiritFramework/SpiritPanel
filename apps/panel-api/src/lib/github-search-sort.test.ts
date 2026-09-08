import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGithubSearchSort } from '../services/github-repo.js';

test('parseGithubSearchSort accepts known values', () => {
  assert.equal(parseGithubSearchSort('stars'), 'stars');
  assert.equal(parseGithubSearchSort('pushed'), 'pushed');
});

test('parseGithubSearchSort defaults to best', () => {
  assert.equal(parseGithubSearchSort(undefined), 'best');
  assert.equal(parseGithubSearchSort('invalid'), 'best');
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyConsoleSuggestion } from './console-suggest';

describe('applyConsoleSuggestion', () => {
  it('replaces the partial command token after a leading slash', () => {
    const applied = applyConsoleSuggestion('/gam', 1, 4, 'gamemode');
    assert.equal(applied.line, '/gamemode');
    assert.equal(applied.cursor, 9);
  });

  it('inserts at the cursor when start and end match', () => {
    const applied = applyConsoleSuggestion('/gamemode', 9, 9, 'survival');
    assert.equal(applied.line, '/gamemodesurvival');
    assert.equal(applied.cursor, 17);
  });
});

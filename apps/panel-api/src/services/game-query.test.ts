import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveQueryTypes } from './game-query.js';
import type { GameQueryEgg } from './game-query.js';

function egg(partial: Partial<GameQueryEgg> & { name: string }): GameQueryEgg {
  return {
    features: [],
    dockerImages: {},
    nest: null,
    ...partial,
  };
}

describe('resolveQueryTypes', () => {
  it('prefers FiveM HTTP for FiveM eggs', () => {
    const types = resolveQueryTypes(
      egg({ name: 'FiveM', features: ['fivem'] }),
      30120,
    );
    assert.equal(types[0], 'fivem-http');
    assert.ok(types.includes('fivem'));
  });

  it('detects minecraft from nest name', () => {
    const types = resolveQueryTypes(
      egg({ name: 'Vanilla', nest: { name: 'Minecraft' } }),
      25565,
    );
    assert.equal(types[0], 'minecraft');
  });

  it('adds port hints for rust', () => {
    const types = resolveQueryTypes(egg({ name: 'Custom Game' }), 28015);
    assert.ok(types.includes('rust'));
  });
});

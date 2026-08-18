import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBedrockOnlyEgg,
  isMinecraftEgg,
  normalizeMinecraftVersion,
  resolveMinecraftEggProfile,
} from '../lib/minecraft-egg.js';

describe('minecraft-egg', () => {
  it('detects Paper eggs and expands loaders', () => {
    const profile = resolveMinecraftEggProfile({ name: 'Paper', nest: { name: 'Minecraft' } });
    assert.equal(profile.isMinecraft, true);
    assert.ok(profile.loaders.includes('paper'));
    assert.ok(profile.loaders.includes('spigot'));
    assert.equal(profile.kind, 'plugin');
  });

  it('detects Fabric as mods', () => {
    const profile = resolveMinecraftEggProfile({ name: 'Fabric', nest: { name: 'Minecraft' } });
    assert.equal(profile.kind, 'mod');
    assert.deepEqual(profile.loaders, ['fabric']);
  });

  it('detects Vanilla datapacks', () => {
    const profile = resolveMinecraftEggProfile({ name: 'Vanilla Minecraft', nest: { name: 'Minecraft' } });
    assert.equal(profile.kind, 'datapack');
    assert.ok(profile.loaders.includes('datapack'));
  });

  it('excludes Bedrock-only eggs', () => {
    assert.equal(isBedrockOnlyEgg({ name: 'PocketMine', nest: { name: 'Minecraft Bedrock' } }), true);
    assert.equal(isMinecraftEgg({ name: 'PocketMine', nest: { name: 'Minecraft Bedrock' } }), false);
  });

  it('parses versions and ignores latest', () => {
    assert.equal(normalizeMinecraftVersion('1.21.4'), '1.21.4');
    assert.equal(normalizeMinecraftVersion('latest'), null);
  });
});

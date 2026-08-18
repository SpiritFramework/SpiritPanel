import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveMinecraftJavaSrv } from './minecraft-srv.js';

describe('resolveMinecraftJavaSrv', () => {
  it('enables SRV for common Java eggs', () => {
    assert.ok(resolveMinecraftJavaSrv({ name: 'Paper', nest: { name: 'Minecraft' } }));
    assert.ok(resolveMinecraftJavaSrv({ name: 'Purpur', nest: { name: 'Minecraft' } }));
    assert.ok(resolveMinecraftJavaSrv({ name: 'Fabric', nest: { name: 'Minecraft' } }));
    assert.ok(resolveMinecraftJavaSrv({ name: 'Velocity', nest: { name: 'Minecraft' } }));
  });

  it('skips Bedrock-only eggs', () => {
    assert.equal(
      resolveMinecraftJavaSrv({ name: 'Bedrock', nest: { name: 'Minecraft Bedrock' } }),
      null,
    );
  });

  it('skips non-minecraft eggs', () => {
    assert.equal(resolveMinecraftJavaSrv({ name: 'FXServer', nest: { name: 'FiveM' } }), null);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertSafeMinecraftPluginDeletePath,
} from './marketplace-safety.js';

describe('assertSafeMinecraftPluginDeletePath', () => {
  it('allows flat plugin/mod/datapack archives', () => {
    assert.equal(assertSafeMinecraftPluginDeletePath('/plugins/Foo.jar'), '/plugins/Foo.jar');
    assert.equal(assertSafeMinecraftPluginDeletePath('/mods/bar.zip'), '/mods/bar.zip');
    assert.equal(
      assertSafeMinecraftPluginDeletePath('/world/datapacks/pack.zip'),
      '/world/datapacks/pack.zip',
    );
  });

  it('rejects directory roots and nested paths', () => {
    assert.throws(() => assertSafeMinecraftPluginDeletePath('/plugins'), /single/);
    assert.throws(() => assertSafeMinecraftPluginDeletePath('/mods'), /single/);
    assert.throws(() => assertSafeMinecraftPluginDeletePath('/plugins/'), /single/);
    assert.throws(() => assertSafeMinecraftPluginDeletePath('/plugins/nested/x.jar'), /single/);
    assert.throws(() => assertSafeMinecraftPluginDeletePath('/world/datapacks'), /single/);
    assert.throws(() => assertSafeMinecraftPluginDeletePath('/server.properties'), /single/);
  });
});

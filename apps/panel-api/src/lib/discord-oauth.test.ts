import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDiscordHandle, isDiscordAuthReady } from './discord-oauth.js';

describe('formatDiscordHandle', () => {
  it('uses plain username for new Discord accounts', () => {
    assert.equal(formatDiscordHandle('callum', '0'), 'callum');
    assert.equal(formatDiscordHandle('callum', '0000'), 'callum');
  });

  it('keeps legacy discriminator tags', () => {
    assert.equal(formatDiscordHandle('callum', '1234'), 'callum#1234');
  });
});

describe('isDiscordAuthReady', () => {
  it('requires enable plus both credentials', () => {
    assert.equal(isDiscordAuthReady({ enabled: true, clientId: 'abc', clientSecret: 'secret' }), true);
    assert.equal(isDiscordAuthReady({ enabled: true, clientId: 'abc', clientSecret: '' }), false);
    assert.equal(isDiscordAuthReady({ enabled: false, clientId: 'abc', clientSecret: 'secret' }), false);
  });
});

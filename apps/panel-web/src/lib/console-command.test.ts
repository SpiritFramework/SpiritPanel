import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveConsoleCommandTransport } from './console-command.js';

describe('resolveConsoleCommandTransport', () => {
  it('prefers websocket when the socket is open', () => {
    assert.equal(resolveConsoleCommandTransport(WebSocket.OPEN), 'websocket');
  });

  it('falls back to http when the socket is not open', () => {
    assert.equal(resolveConsoleCommandTransport(WebSocket.CLOSED), 'http');
    assert.equal(resolveConsoleCommandTransport(WebSocket.CONNECTING), 'http');
    assert.equal(resolveConsoleCommandTransport(undefined), 'http');
  });
});

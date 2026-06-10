import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getServerDisplayStatus, mergePanelAndRuntimeStatus } from './server-runtime.js';

describe('mergePanelAndRuntimeStatus', () => {
  it('shows Offline not Install failed for normal + stale install flags', () => {
    const result = mergePanelAndRuntimeStatus('normal', 'failed', null, false, 'install_failed');
    assert.equal(result.label, 'Offline');
    assert.equal(result.tone, 'muted');
  });

  it('shows Running when container state is running without websocket', () => {
    const result = mergePanelAndRuntimeStatus('normal', 'failed', null, false, 'running');
    assert.equal(result.label, 'Running');
    assert.equal(result.tone, 'success');
  });

  it('shows Offline for installed + stale install_failed container', () => {
    const result = mergePanelAndRuntimeStatus('normal', 'installed', null, false, 'install_failed');
    assert.equal(result.label, 'Offline');
  });

  it('shows Install failed for genuine install_failed panel status', () => {
    const result = mergePanelAndRuntimeStatus('install_failed', 'failed', null, false, 'install_failed');
    assert.equal(result.label, 'Install failed');
    assert.equal(result.tone, 'danger');
  });

  it('shows Running for installed server with running container state', () => {
    const result = mergePanelAndRuntimeStatus('normal', 'installed', null, false, 'running');
    assert.equal(result.label, 'Running');
    assert.equal(result.tone, 'success');
  });

  it('shows Offline for installed server that is stopped', () => {
    const result = mergePanelAndRuntimeStatus('normal', 'installed', null, false, 'offline');
    assert.equal(result.label, 'Offline');
  });

  it('shows Starting when container state is starting without websocket', () => {
    const result = mergePanelAndRuntimeStatus('normal', 'installed', null, false, 'starting');
    assert.equal(result.label, 'Starting');
    assert.equal(result.tone, 'warning');
  });

  it('shows Running when websocket reports running despite stale install flags', () => {
    const result = mergePanelAndRuntimeStatus('normal', 'failed', 'running', true, 'install_failed');
    assert.equal(result.label, 'Running');
  });
});

describe('getServerDisplayStatus', () => {
  it('uses websocket runtime over stale DB install flags', () => {
    const display = getServerDisplayStatus(
      { status: 'normal', installStatus: 'failed', containerState: 'install_failed' },
      { runtimeState: 'running', wsConnected: true },
    );
    assert.equal(display.label, 'Running');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNodeFleetStatus, matchesFleetFilter } from './node-fleet-utils';
import type { AdminNodeSummary } from '../../../lib/api';

function mockNode(overrides: Partial<AdminNodeSummary> = {}): AdminNodeSummary {
  return {
    id: '1',
    uuid: '00000000-0000-0000-0000-000000000001',
    name: 'Node A',
    description: '',
    fqdn: 'node.example.com',
    scheme: 'https',
    maintenanceMode: false,
    memory: 0,
    disk: 0,
    daemonListen: 8080,
    daemonSftp: 2022,
    createdAt: '',
    location: { id: 'loc', short: 'EU', long: 'Europe' },
    _count: { servers: 0, allocations: 0 },
    ...overrides,
  };
}

describe('getNodeFleetStatus', () => {
  it('detects maintenance, offline, and online', () => {
    assert.equal(getNodeFleetStatus(mockNode({ maintenanceMode: true })), 'maintenance');
    assert.equal(getNodeFleetStatus(mockNode({ online: false })), 'offline');
    assert.equal(getNodeFleetStatus(mockNode({ online: true })), 'online');
  });
});

describe('matchesFleetFilter', () => {
  it('filters by fleet status', () => {
    const online = mockNode({ online: true });
    const offline = mockNode({ online: false });
    assert.equal(matchesFleetFilter(online, 'online'), true);
    assert.equal(matchesFleetFilter(offline, 'online'), false);
    assert.equal(matchesFleetFilter(offline, 'offline'), true);
  });
});

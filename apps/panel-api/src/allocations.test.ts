import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canAddAllocation, listServerAllocations } from './services/allocations.js';
import type { Allocation } from '@prisma/client';

function alloc(id: string, overrides: Partial<Allocation> = {}): Allocation {
  return {
    id,
    nodeId: 'node1',
    ip: '0.0.0.0',
    port: 25565,
    alias: null,
    notes: null,
    assigned: true,
    serverId: 'server1',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('allocation limits', () => {
  it('treats limit 0 as none allowed', () => {
    const server = {
      allocationId: 'primary',
      allocationLimit: 0,
      extraAllocations: [alloc('extra1'), alloc('extra2')],
    };
    assert.equal(canAddAllocation(server), false);
  });

  it('blocks when used reaches a positive limit', () => {
    const server = {
      allocationId: 'primary',
      allocationLimit: 1,
      extraAllocations: [],
    };
    assert.equal(canAddAllocation(server), false);
  });

  it('allows creation below a positive limit', () => {
    const server = {
      allocationId: 'primary',
      allocationLimit: 2,
      extraAllocations: [],
    };
    assert.equal(canAddAllocation(server), true);
  });

  it('lists primary and secondary allocations separately', () => {
    const primary = alloc('primary', { serverId: null });
    const secondary = alloc('extra1');
    const payload = listServerAllocations({
      id: 'server1',
      allocationId: 'primary',
      allocationLimit: 0,
      node: {
        id: 'node1',
        fqdn: 'node.example.com',
      } as never,
      defaultAllocation: primary,
      extraAllocations: [primary, secondary],
    } as never);

    assert.equal(payload.used, 2);
    assert.equal(payload.allocations.length, 2);
    assert.equal(payload.canCreate, false);
    assert.equal(payload.allocations[0]?.isDefault, true);
    assert.match(payload.allocations[0]?.address ?? '', /node\.example\.com:25565/);
  });
});

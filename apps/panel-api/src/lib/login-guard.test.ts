import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from './login-guard.js';

describe('login guard', () => {
  const identifier = `audit-user-${Date.now()}`;

  beforeEach(async () => {
    await clearLoginFailures(identifier, '1.1.1.1');
    await clearLoginFailures(identifier, '2.2.2.2');
  });

  it('allows login before the failure threshold', async () => {
    await assert.doesNotReject(() => assertLoginAllowed(identifier, '1.1.1.1'));
  });

  it('locks the identifier+ip pair after enough failures', async () => {
    for (let i = 0; i < 10; i++) {
      await recordLoginFailure(identifier, '1.1.1.1');
    }
    await assert.rejects(() => assertLoginAllowed(identifier, '1.1.1.1'), { statusCode: 429 });
  });

  it('locks the account identity across IPs after enough failures', async () => {
    for (let i = 0; i < 10; i++) {
      await recordLoginFailure(identifier, `10.0.0.${i}`);
    }
    await assert.rejects(() => assertLoginAllowed(identifier, '203.0.113.9'), { statusCode: 429 });
  });

  it('clears both pair and account locks on success', async () => {
    for (let i = 0; i < 10; i++) {
      await recordLoginFailure(identifier, '1.1.1.1');
    }
    await clearLoginFailures(identifier, '1.1.1.1');
    await assert.doesNotReject(() => assertLoginAllowed(identifier, '1.1.1.1'));
    await assert.doesNotReject(() => assertLoginAllowed(identifier, '9.9.9.9'));
  });
});

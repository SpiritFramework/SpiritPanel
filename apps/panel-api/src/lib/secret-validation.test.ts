import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertProductionSecrets,
  isPlaceholderSecret,
  isWeakAdminPassword,
} from './secret-validation.js';

describe('secret validation', () => {
  it('detects placeholder secrets', () => {
    assert.equal(isPlaceholderSecret('CHANGE_ME'), true);
    assert.equal(isPlaceholderSecret('dev-only-change-in-production'), true);
    assert.equal(isPlaceholderSecret('short'), true);
    assert.equal(isPlaceholderSecret('a'.repeat(32)), false);
  });

  it('detects weak admin passwords', () => {
    assert.equal(isWeakAdminPassword('admin123!'), true);
    assert.equal(isWeakAdminPassword('MySecurePass2026!'), false);
  });

  it('requires strong production secrets', () => {
    const good = {
      jwtSecret: 'jwt-' + 'x'.repeat(32),
      appKey: 'app-' + 'y'.repeat(32),
      apiUrl: 'https://panel.example.com',
      databaseUrl: 'mysql://user:pass@127.0.0.1:3306/spirit_panel',
      host: '127.0.0.1',
      redisPassword: 'redis-' + 'z'.repeat(24),
      redisAllowInsecure: false,
      disableScheduleWorker: false,
    };
    assert.doesNotThrow(() => assertProductionSecrets(good));

    assert.throws(() =>
      assertProductionSecrets({
        ...good,
        apiUrl: 'http://localhost:3000',
      }),
    );
  });
});

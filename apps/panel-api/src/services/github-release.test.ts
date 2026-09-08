import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  codeloadBranchArchiveUrl,
  codeloadTagArchiveUrl,
  predictArchiveFolder,
} from '../services/github-release.js';

describe('github-release archive urls', () => {
  it('builds tag and branch codeload urls', () => {
    assert.equal(
      codeloadTagArchiveUrl('overextended', 'ox_lib', 'v3.0.0'),
      'https://codeload.github.com/overextended/ox_lib/zip/refs/tags/v3.0.0',
    );
    assert.equal(
      codeloadBranchArchiveUrl('owner', 'repo', 'main'),
      'https://codeload.github.com/owner/repo/zip/refs/heads/main',
    );
  });

  it('predicts extracted folder names', () => {
    assert.equal(predictArchiveFolder('ox_lib', 'v3.0.0'), 'ox_lib-3.0.0');
    assert.equal(predictArchiveFolder('ox_lib', 'main'), 'ox_lib-main');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseGithubRepoInput } from '../services/github-repo.js';

describe('parseGithubRepoInput', () => {
  it('aliases archived CommunityOx ox repos to overextended', () => {
    assert.deepEqual(parseGithubRepoInput('CommunityOx/ox_lib'), {
      owner: 'overextended',
      repo: 'ox_lib',
    });
    assert.deepEqual(parseGithubRepoInput('https://github.com/CommunityOx/oxmysql'), {
      owner: 'overextended',
      repo: 'oxmysql',
    });
  });

  it('keeps overextended repos unchanged', () => {
    assert.deepEqual(parseGithubRepoInput('overextended/ox_lib'), {
      owner: 'overextended',
      repo: 'ox_lib',
    });
  });
});

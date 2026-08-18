import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isReadmeBadgeUrl, resolveGithubMarkdownUrl } from '../components/MarkdownReadme';

describe('resolveGithubMarkdownUrl', () => {
  const ctx = { owner: 'overextended', repo: 'ox_lib', branch: 'main' };

  it('keeps absolute https image urls', () => {
    assert.equal(
      resolveGithubMarkdownUrl('https://raw.githubusercontent.com/overextended/ox_lib/main/web.png', ctx, 'image'),
      'https://raw.githubusercontent.com/overextended/ox_lib/main/web.png',
    );
  });

  it('rewrites relative images to raw.githubusercontent.com', () => {
    assert.equal(
      resolveGithubMarkdownUrl('./assets/preview.png', ctx, 'image'),
      'https://raw.githubusercontent.com/overextended/ox_lib/main/assets/preview.png',
    );
  });

  it('rewrites relative links to github blob urls', () => {
    assert.equal(
      resolveGithubMarkdownUrl('docs/guide.md', ctx, 'link'),
      'https://github.com/overextended/ox_lib/blob/main/docs/guide.md',
    );
  });

  it('rejects traversal', () => {
    assert.equal(resolveGithubMarkdownUrl('../secret.png', ctx, 'image'), null);
  });
});

describe('isReadmeBadgeUrl', () => {
  it('detects shields.io badges', () => {
    assert.equal(
      isReadmeBadgeUrl(
        'https://img.shields.io/github/downloads/overextended/ox_lib/total?style=for-the-badge&logo=github',
      ),
      true,
    );
  });

  it('does not mark normal screenshots as badges', () => {
    assert.equal(
      isReadmeBadgeUrl('https://raw.githubusercontent.com/overextended/ox_lib/main/web/images/preview.png'),
      false,
    );
  });
});

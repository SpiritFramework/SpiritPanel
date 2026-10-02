import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findExtractedResourceFolder } from './marketplace-installer.js';

describe('marketplace archive resource folder detection', () => {
  it('accepts a flat resource archive with a manifest at the archive root', () => {
    const entries = [
      { name: 'fxmanifest.lua', directory: false },
      { name: 'MenuAPI.dll', directory: false },
      { name: '[gamemodes]', directory: true },
      { name: '[local]', directory: true },
      { name: 'config', directory: true },
    ];

    assert.equal(findExtractedResourceFolder(entries, 'vMenu', 'vMenu-main', true, new Set()), null);
  });

  it('selects the predicted wrapper directory in a standard archive', () => {
    const entries = [
      { name: 'vMenu-main', directory: true },
      { name: 'another-folder', directory: true },
    ];

    assert.equal(findExtractedResourceFolder(entries, 'vMenu', 'vMenu-main', false, new Set()), 'vMenu-main');
  });

  it('selects a nested directory containing a resource manifest', () => {
    const entries = [
      { name: 'docs', directory: true },
      { name: 'resource', directory: true },
    ];

    assert.equal(findExtractedResourceFolder(entries, 'vMenu', 'vMenu-main', false, new Set(['resource'])), 'resource');
  });

  it('rejects an ambiguous archive without a resource manifest', () => {
    const entries = [
      { name: 'first', directory: true },
      { name: 'second', directory: true },
    ];

    assert.throws(
      () => findExtractedResourceFolder(entries, 'vMenu', 'vMenu-main', false, new Set()),
      /Could not locate extracted resource folder/,
    );
  });
});
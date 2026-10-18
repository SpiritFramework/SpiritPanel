import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { highlightCode } from './syntax-highlighter';

describe('highlightCode', () => {
  it('does not hang on a lone @ character', () => {
    const tokens = highlightCode('@', 'javascript');
    assert.ok(tokens.length >= 1);
    assert.equal(tokens.map((t) => t.content).join(''), '@');
  });

  it('tokenizes @decorator and @media without stalling', () => {
    const js = highlightCode('@decorator\nconst x = 1;', 'javascript');
    assert.equal(js.map((t) => t.content).join(''), '@decorator\nconst x = 1;');

    const css = highlightCode('@media screen { color: red; }', 'css');
    assert.equal(css.map((t) => t.content).join(''), '@media screen { color: red; }');
    assert.ok(css.some((t) => t.type === 'keyword' && t.content.startsWith('@media')));
  });

  it('handles paste-like content containing many @ mentions', () => {
    const body = Array.from({ length: 200 }, (_, i) => `const a${i} = "@user${i}";`).join('\n');
    const tokens = highlightCode(body, 'javascript');
    assert.equal(tokens.map((t) => t.content).join(''), body);
  });
});

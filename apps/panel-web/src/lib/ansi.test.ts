import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAnsi, stripAnsi } from './ansi.ts';

describe('parseAnsi', () => {
  it('returns plain text unchanged', () => {
    const segs = parseAnsi('hello world');
    assert.equal(segs.length, 1);
    assert.equal(segs[0]?.text, 'hello world');
    assert.deepEqual(segs[0]?.style, {});
  });

  it('applies basic foreground colors', () => {
    const segs = parseAnsi('\u001b[32mgreen\u001b[0m plain');
    assert.equal(segs.length, 2);
    assert.equal(segs[0]?.text, 'green');
    assert.equal(segs[0]?.style.color, '#4ade80');
    assert.equal(segs[1]?.text, ' plain');
    assert.deepEqual(segs[1]?.style, {});
  });

  it('handles 256-color and truecolor', () => {
    const c256 = parseAnsi('\u001b[38;5;196mred\u001b[0m');
    assert.equal(c256[0]?.text, 'red');
    assert.ok(c256[0]?.style.color);

    const truec = parseAnsi('\u001b[38;2;255;128;0morange\u001b[0m');
    assert.equal(truec[0]?.text, 'orange');
    assert.equal(truec[0]?.style.color, 'rgb(255,128,0)');
  });

  it('strips non-SGR sequences', () => {
    const segs = parseAnsi('\u001b[Kcleared\u001b[2J');
    assert.equal(stripAnsi('\u001b[32mhi\u001b[0m'), 'hi');
    assert.equal(segs.map((s) => s.text).join(''), 'cleared');
  });
});

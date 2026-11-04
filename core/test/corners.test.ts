import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultConfig, type Action } from '../src/index.js';
import { rect } from './fixtures.js';
import { press } from './run.js';

// Work area 0,27 3008x1665. The axis is horizontal by default.
const horizontalCycles: Record<string, ReturnType<typeof rect>[]> = {
  'top-left': [rect(0, 27, 1504, 832), rect(0, 27, 2005, 832), rect(0, 27, 1002, 832), rect(0, 27, 1504, 832)],
  'top-right': [rect(1504, 27, 1504, 832), rect(1003, 27, 2005, 832), rect(2006, 27, 1002, 832), rect(1504, 27, 1504, 832)],
  'bottom-left': [rect(0, 860, 1504, 832), rect(0, 860, 2005, 832), rect(0, 860, 1002, 832), rect(0, 860, 1504, 832)],
  'bottom-right': [rect(1504, 860, 1504, 832), rect(1003, 860, 2005, 832), rect(2006, 860, 1002, 832), rect(1504, 860, 1504, 832)],
};

describe('corners', () => {
  for (const [action, expected] of Object.entries(horizontalCycles)) {
    test(`${action} keeps the height and cycles the width`, () => {
      const frames = press([action, action, action, action] as Action[]);

      assert.deepEqual(frames, expected);
    });
  }

  test('with the vertical axis, bottom-right keeps the width and cycles the height', () => {
    const config = { ...defaultConfig, cornerAxis: 'vertical' as const };

    const frames = press(['bottom-right', 'bottom-right', 'bottom-right'], { config });

    assert.deepEqual(frames, [rect(1504, 860, 1504, 832), rect(1504, 582, 1504, 1110), rect(1504, 1137, 1504, 555)]);
  });

  test('another corner starts at one quarter again', () => {
    const frames = press(['top-left', 'top-left', 'top-right']);

    assert.deepEqual(frames[2], rect(1504, 27, 1504, 832));
  });
});

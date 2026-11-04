import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Action } from '../src/index.js';
import { rect } from './fixtures.js';
import { press } from './run.js';

// Work area 0,27 3008x1665. Fractions floor like Rectangle HalfSplitFrameCalculation.
const cycles: Record<string, ReturnType<typeof rect>[]> = {
  'left-half': [rect(0, 27, 1504, 1665), rect(0, 27, 2005, 1665), rect(0, 27, 1002, 1665), rect(0, 27, 1504, 1665)],
  'right-half': [rect(1504, 27, 1504, 1665), rect(1003, 27, 2005, 1665), rect(2006, 27, 1002, 1665), rect(1504, 27, 1504, 1665)],
  'top-half': [rect(0, 27, 3008, 832), rect(0, 27, 3008, 1110), rect(0, 27, 3008, 555), rect(0, 27, 3008, 832)],
  'bottom-half': [rect(0, 860, 3008, 832), rect(0, 582, 3008, 1110), rect(0, 1137, 3008, 555), rect(0, 860, 3008, 832)],
};

describe('halves', () => {
  for (const [action, expected] of Object.entries(cycles)) {
    test(`${action} cycles 1/2, 2/3, 1/3 and back to 1/2`, () => {
      const frames = press([action, action, action, action] as Action[]);

      assert.deepEqual(frames, expected);
    });
  }

  test('another half action starts at one half again', () => {
    const frames = press(['left-half', 'left-half', 'right-half']);

    assert.deepEqual(frames[2], rect(1504, 27, 1504, 1665));
  });

  test('a window moved by hand starts at one half again', () => {
    const [first] = press(['left-half']);
    const moved = { ...first!, x: 40 };

    const frames = press(['left-half'], {
      frame: moved,
      history: { restoreRect: rect(100, 200, 800, 600), lastAction: { action: 'left-half', rect: first!, count: 1 } },
    });

    assert.deepEqual(frames[0], rect(0, 27, 1504, 1665));
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Action } from '../src/index.js';
import { portraitMonitor, rect } from './fixtures.js';
import { press } from './run.js';

// Landscape work area 0,27 3008x1665.
const left = rect(0, 27, 1002, 1665);
const center = rect(1002, 27, 1003, 1665);
const right = rect(2006, 27, 1002, 1665);
const leftTwo = rect(0, 27, 2005, 1665);
const rightTwo = rect(1003, 27, 2005, 1665);

// Portrait work area 0,27 1080x1893.
const top = rect(0, 27, 1080, 631);
const middle = rect(0, 658, 1080, 631);
const bottom = rect(0, 1289, 1080, 631);
const topTwo = rect(0, 27, 1080, 1262);
const bottomTwo = rect(0, 658, 1080, 1262);

const landscapeCycles: [Action, ReturnType<typeof rect>[]][] = [
  ['first-third', [left, center, right, left]],
  ['center-third', [center, center]],
  ['last-third', [right, center, left, right]],
  ['first-two-thirds', [leftTwo, rightTwo, leftTwo]],
  ['last-two-thirds', [rightTwo, leftTwo, rightTwo]],
];

const portraitCycles: [Action, ReturnType<typeof rect>[]][] = [
  ['first-third', [top, middle, bottom, top]],
  ['center-third', [middle]],
  ['last-third', [bottom, middle, top, bottom]],
  ['first-two-thirds', [topTwo, bottomTwo, topTwo]],
  ['last-two-thirds', [bottomTwo, topTwo]],
];

describe('thirds on a landscape monitor', () => {
  for (const [action, expected] of landscapeCycles) {
    test(`${action} cycles through its positions`, () => {
      const frames = press(expected.map(() => action));

      assert.deepEqual(frames, expected);
    });
  }

  test('last third after first third on the right third goes to the center', () => {
    const frames = press(['first-third', 'first-third', 'first-third', 'last-third']);

    assert.deepEqual(frames[3], center);
  });

  test('first third after last third on the left third goes to the center', () => {
    const frames = press(['last-third', 'last-third', 'last-third', 'first-third']);

    assert.deepEqual(frames[3], center);
  });
});

describe('thirds on a portrait monitor stack from top to bottom', () => {
  for (const [action, expected] of portraitCycles) {
    test(`${action} cycles through its positions`, () => {
      const frames = press(
        expected.map(() => action),
        { monitors: [portraitMonitor] },
      );

      assert.deepEqual(frames, expected);
    });
  }
});

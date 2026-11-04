import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calculations } from '../src/calculations/index.js';
import { allActions, execute, type Action, type Rect } from '../src/index.js';
import { input, isInside, rect, twoMonitors } from './fixtures.js';

// One press of every action on the development monitor: 3008x1692 with a
// 27 px top bar, and a 1920x1080 monitor to the right of it. The window
// starts at 100,200 with a size of 800x600 and has no history.
const firstPress: Record<Exclude<Action, 'restore'>, { frame: Rect; monitorIndex: number }> = {
  'left-half': { frame: rect(0, 27, 1504, 1665), monitorIndex: 0 },
  'right-half': { frame: rect(1504, 27, 1504, 1665), monitorIndex: 0 },
  'top-half': { frame: rect(0, 27, 3008, 832), monitorIndex: 0 },
  'bottom-half': { frame: rect(0, 860, 3008, 832), monitorIndex: 0 },
  maximize: { frame: rect(0, 27, 3008, 1665), monitorIndex: 0 },
  'almost-maximize': { frame: rect(151, 110, 2707, 1499), monitorIndex: 0 },
  center: { frame: rect(1104, 560, 800, 600), monitorIndex: 0 },
  'maximize-height': { frame: rect(100, 27, 800, 1665), monitorIndex: 0 },
  larger: { frame: rect(85, 185, 830, 630), monitorIndex: 0 },
  smaller: { frame: rect(115, 215, 770, 570), monitorIndex: 0 },
  'previous-display': { frame: rect(3008, 7, 800, 600), monitorIndex: 1 },
  'next-display': { frame: rect(3008, 7, 800, 600), monitorIndex: 1 },
  'top-left': { frame: rect(0, 27, 1504, 832), monitorIndex: 0 },
  'top-right': { frame: rect(1504, 27, 1504, 832), monitorIndex: 0 },
  'bottom-left': { frame: rect(0, 860, 1504, 832), monitorIndex: 0 },
  'bottom-right': { frame: rect(1504, 860, 1504, 832), monitorIndex: 0 },
  'first-third': { frame: rect(0, 27, 1002, 1665), monitorIndex: 0 },
  'center-third': { frame: rect(1002, 27, 1003, 1665), monitorIndex: 0 },
  'last-third': { frame: rect(2006, 27, 1002, 1665), monitorIndex: 0 },
  'first-two-thirds': { frame: rect(0, 27, 2005, 1665), monitorIndex: 0 },
  'last-two-thirds': { frame: rect(1003, 27, 2005, 1665), monitorIndex: 0 },
  'move-left': { frame: rect(0, 560, 800, 600), monitorIndex: 0 },
  'move-right': { frame: rect(2208, 560, 800, 600), monitorIndex: 0 },
  'move-up': { frame: rect(1104, 27, 800, 600), monitorIndex: 0 },
  'move-down': { frame: rect(1104, 1092, 800, 600), monitorIndex: 0 },
};

describe('every action on the development monitor', () => {
  test('every action except restore has a calculation', () => {
    const missing = allActions.filter((action) => action !== 'restore' && calculations[action] === undefined);

    assert.deepEqual(missing, []);
  });

  for (const [action, expected] of Object.entries(firstPress)) {
    test(`${action} from a floating window`, () => {
      const result = execute(input({ action: action as Action, monitors: twoMonitors }));

      assert.deepEqual(result.change, expected);
    });
  }
});

describe('every result lies inside the work area of its monitor', () => {
  const frames = [
    rect(100, 200, 800, 600),
    rect(0, 27, 3008, 1665),
    rect(-300, -100, 900, 700),
    rect(2700, 1500, 900, 700),
    rect(10, 40, 4000, 2000),
    rect(3100, 100, 600, 400),
  ];
  for (const canResize of [true, false]) {
    test(`with canResize ${canResize}`, () => {
      for (const action of allActions.filter((a) => a !== 'restore')) {
        for (const frame of frames) {
          const monitorIndex = frame.x >= 3008 ? 1 : 0;
          const result = execute(input({ action, frame, monitorIndex, monitors: twoMonitors, canResize }));
          if (result.change === null) continue;

          const { workArea } = twoMonitors[result.change.monitorIndex]!;
          const fits = frame.width <= workArea.width && frame.height <= workArea.height;
          if (canResize || fits) {
            assert.ok(isInside(result.change.frame, workArea), `${action} ${JSON.stringify(frame)} gave ${JSON.stringify(result.change.frame)}`);
          }
          if (!canResize) {
            assert.deepEqual([result.change.frame.width, result.change.frame.height], [frame.width, frame.height], action);
          }
        }
      }
    });
  }
});

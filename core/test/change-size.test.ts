import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { changeSize } from '../src/calculations/change-size.js';
import { execute } from '../src/index.js';
import { input, rect, singleMonitor } from './fixtures.js';

// Ported from Rectangle ChangeSizeCalculationTests. Those tests set the
// minimum window fraction to 0 unless they say otherwise.
describe('changeSize (Rectangle ChangeSizeCalculationTests)', () => {
  const visibleFrame = rect(0, 0, 2560, 1415);
  const issueWindowRect = rect(1895, 0, 665, 1415);
  const smaller = (frame: ReturnType<typeof rect>, minimumFraction = 0) =>
    changeSize(frame, visibleFrame, 'smaller', 30, minimumFraction);

  test('testExplicitZeroDisablesScreenFractionMinimum', () => {
    assert.deepEqual(smaller(issueWindowRect), rect(1925, 0, 635, 1415));
  });

  test('testSmallerCanReachExactConfiguredMinimum', () => {
    assert.deepEqual(smaller(rect(1890, 0, 670, 1415), 0.25), rect(1920, 0, 640, 1415));
  });

  test('testSmallerHonorsConfiguredScreenFractionMinimum', () => {
    assert.deepEqual(smaller(issueWindowRect, 0.25), issueWindowRect);
  });

  test('testSmallerKeepsHeightOfFullHeightWindowByDefault', () => {
    assert.deepEqual(smaller(rect(0, 0, 1280, 1415)), rect(0, 0, 1250, 1415));
  });

  test('testSmallConfiguredScreenFractionAllowsIssueRegressionStep', () => {
    assert.deepEqual(smaller(issueWindowRect, 0.01), rect(1925, 0, 635, 1415));
  });

  test('testExplicitZeroStillRejectsNonpositiveSize', () => {
    const narrowWindow = rect(100, 100, 20, 100);

    assert.deepEqual(smaller(narrowWindow), narrowWindow);
  });
});

describe('larger and smaller', () => {
  const cases = [
    { name: 'larger grows 30 px around the center', action: 'larger', frame: rect(100, 200, 800, 600), expected: rect(85, 185, 830, 630) },
    { name: 'smaller shrinks 30 px around the center', action: 'smaller', frame: rect(100, 200, 800, 600), expected: rect(115, 215, 770, 570) },
    { name: 'larger keeps the edges that touch the work area', action: 'larger', frame: rect(0, 27, 1504, 1665), expected: rect(0, 27, 1534, 1665) },
    { name: 'larger keeps the bottom edge of a bottom-right corner', action: 'larger', frame: rect(1504, 860, 1504, 832), expected: rect(1474, 830, 1534, 862) },
    { name: 'smaller on a maximized window shrinks both axes', action: 'smaller', frame: rect(0, 27, 3008, 1665), expected: rect(15, 42, 2978, 1635) },
    { name: 'larger never grows past the work area', action: 'larger', frame: rect(10, 40, 2990, 1640), expected: rect(0, 27, 3008, 1665) },
  ] as const;
  for (const { name, action, frame, expected } of cases) {
    test(name, () => {
      const result = execute(input({ action, frame }));

      assert.deepEqual(result.change?.frame, expected);
    });
  }

  test('larger on a maximized window does not change it', () => {
    const result = execute(input({ action: 'larger', frame: singleMonitor.workArea }));

    assert.equal(result.change, null);
  });

  test('smaller stops at 25 percent of the work area', () => {
    const result = execute(input({ action: 'smaller', frame: rect(100, 200, 760, 420) }));

    assert.equal(result.change, null);
  });

  test('uses the configured step size', () => {
    const config = { ...input({}).config, stepSize: 100 };

    const result = execute(input({ action: 'larger', frame: rect(100, 200, 800, 600), config }));

    assert.deepEqual(result.change?.frame, rect(50, 150, 900, 700));
  });
});

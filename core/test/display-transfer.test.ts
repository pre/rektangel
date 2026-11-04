import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { transferredRect } from '../src/calculations/display-transfer.js';
import type { Rect } from '../src/index.js';
import { rect } from './fixtures.js';

// Ported from Rectangle DisplayTransferTests. The transfer treats the two
// ends of an axis the same way, so the numbers are valid with the y axis
// pointing down too. Only the names "top" and "bottom" swap.
const laptop = rect(0, 0, 1512, 945);
const external = rect(1512, -235, 2560, 1415);
const portrait = rect(-1440, -800, 1440, 2560);

const transfer = (window: Rect, source: Rect, destination: Rect, edgeTolerance = 4): Rect =>
  transferredRect(window, source, destination, edgeTolerance).rect;

const inset = (r: Rect, dx: number, dy: number): Rect => rect(r.x + dx, r.y + dy, r.width - 2 * dx, r.height - 2 * dy);

function assertRect(actual: Rect, expected: Rect): void {
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    assert.ok(Math.abs(actual[key] - expected[key]) <= 0.001, `${key}: ${actual[key]} is not ${expected[key]}`);
  }
}

describe('transferredRect (Rectangle DisplayTransferTests)', () => {
  test('testMaximizedWindowFillsTheLargerDestination', () => {
    assertRect(transfer(laptop, laptop, external), external);
  });

  test('testMaximizedWindowFillsTheSmallerDestination', () => {
    assertRect(transfer(external, external, laptop), laptop);
  });

  test('testTheDistanceFromTheEdgesIsCarriedOverSoGapsSurvive', () => {
    assertRect(transfer(inset(laptop, 10, 10), laptop, external, 14), inset(external, 10, 10));
  });

  test('testLeftHalfKeepsItsWidthAndStaysOnTheLeft', () => {
    assertRect(transfer(rect(0, 0, 756, 945), laptop, external), rect(1512, -235, 756, 1415));
  });

  test('testRightHalfKeepsItsWidthAndStaysOnTheRight', () => {
    assertRect(transfer(rect(756, 0, 756, 945), laptop, external), rect(3316, -235, 756, 1415));
  });

  test('testRightHalfOfTheLargerDisplayStaysOnTheRightOfTheSmallerOne', () => {
    assertRect(transfer(rect(2792, -235, 1280, 1415), external, laptop), rect(232, 0, 1280, 945));
  });

  test('testQuarterArrivesInTheSameCorner', () => {
    assertRect(transfer(rect(756, 472.5, 756, 472.5), laptop, external), rect(3316, 707.5, 756, 472.5));
  });

  test('testWindowHangingOffTheEdgeIsBroughtBackOn', () => {
    assertRect(transfer(rect(-200, 0, 500, 400), laptop, external), rect(1512, -235, 500, 400));
  });

  test('testCenteredWindowStaysCenteredAtTheSameSize', () => {
    assertRect(transfer(rect(556, 300, 400, 345), laptop, external), rect(2592, 300, 400, 345));
  });

  test('testWindowInTheRightThirdArrivesInTheRightThird', () => {
    const window = rect(1000, 300, 400, 345);

    const transferred = transfer(window, laptop, external);

    const midX = (r: Rect) => r.x + r.width / 2;
    assert.ok(Math.abs((midX(transferred) - external.x) / external.width - (midX(window) - laptop.x) / laptop.width) <= 0.001);
    assert.equal(transferred.width, window.width);
    assert.equal(transferred.height, window.height);
  });

  test('testTheTwoAxesAreIndependent', () => {
    assertRect(transfer(rect(0, 300, 400, 345), laptop, external), rect(1512, 300, 400, 345));
  });

  test('testWindowTooLargeForTheDestinationIsCutDownToFit', () => {
    assertRect(transfer(rect(1612, -135, 2360, 1215), external, laptop), laptop);
  });

  test('testLeftHalfMovedToPortraitIsCenteredAlongTheLeftEdge', () => {
    assertRect(transfer(rect(1512, -235, 1280, 1415), external, portrait), rect(-1440, -227.5, 1280, 1415));
  });

  test('testRightHalfMovedToPortraitIsCenteredAlongTheRightEdge', () => {
    assertRect(transfer(rect(2792, -235, 1280, 1415), external, portrait), rect(-1280, -227.5, 1280, 1415));
  });

  test('testTopHalfMovedToLandscapeIsCenteredAlongTheTopEdge', () => {
    assertRect(transfer(rect(-1440, -800, 1440, 1280), portrait, external), rect(2072, -235, 1440, 1280));
  });

  test('testBottomHalfMovedToLandscapeIsCenteredAlongTheBottomEdge', () => {
    assertRect(transfer(rect(-1440, 480, 1440, 1280), portrait, external), rect(2072, -100, 1440, 1280));
  });

  test('testCenteringAlongTheMiddleEdgeKeepsTheGapAgainstIt', () => {
    assertRect(transfer(rect(1522, -225, 1270, 1395), external, portrait, 14), rect(-1430, -217.5, 1270, 1395));
  });

  test('testThreeEdgeWindowTooLongToCenterStillSpans', () => {
    assertRect(transfer(rect(-1440, -800, 720, 2560), portrait, laptop), rect(0, 0, 720, 945));
  });

  test('testMaximizedWindowStillFillsADisplayOfTheOtherOrientation', () => {
    assertRect(transfer(external, external, portrait), portrait);
    assertRect(transfer(portrait, portrait, laptop), laptop);
  });

  test('testWindowAgainstOnlyTwoOppositeEdgesStillSpansAcrossOrientations', () => {
    assertRect(transfer(rect(2200, -235, 1000, 1415), external, portrait), rect(-1271.75, -800, 1000, 2560));
  });

  test('testIssue1723RightThirdStaysAgainstTheRightEdge', () => {
    assertRect(transfer(rect(2000, 0, 1000, 2000), rect(0, 0, 3000, 2000), rect(0, 0, 1500, 1000)), rect(500, 0, 1000, 1000));
  });

  test('testIssue1723CenteredQuarterKeepsItsSize', () => {
    assertRect(transfer(rect(960, 360, 640, 720), rect(0, 0, 2560, 1440), rect(0, 0, 1280, 720)), rect(320, 0, 640, 720));
  });

  test('testIssue1723OverflowIsCutDownToFit', () => {
    const destination = rect(0, 0, 500, 500);

    assertRect(transfer(rect(500, 0, 600, 1000), rect(0, 0, 1000, 1000), destination), destination);
  });

  test('testMovingBetweenIdenticalDisplaysLeavesTheWindowAlone', () => {
    for (const window of [laptop, rect(0, 0, 756, 945), rect(556, 300, 400, 345), rect(1000, 300, 400, 345)]) {
      assertRect(transfer(window, laptop, laptop), window);
    }
  });

  test('testEmptyFrameIsLeftAlone', () => {
    const window = rect(556, 300, 400, 345);

    assertRect(transfer(window, rect(0, 0, 0, 0), external), window);
    assertRect(transfer(window, laptop, rect(0, 0, 0, 0)), window);
  });

  test('testTheResultAlwaysFitsOnTheDestination', () => {
    const windows = [
      laptop,
      inset(laptop, 10, 10),
      rect(0, 0, 756, 945),
      rect(756, 472.5, 756, 472.5),
      rect(-200, -100, 500, 400),
      rect(1400, 800, 400, 345),
      rect(556, 300, 400, 345),
    ];
    const pairs = [
      [laptop, external],
      [external, laptop],
      [laptop, portrait],
      [portrait, laptop],
    ] as const;
    for (const window of windows) {
      for (const [source, destination] of pairs) {
        const t = transfer(window, source, destination);
        const fits =
          t.x >= destination.x - 0.001 &&
          t.y >= destination.y - 0.001 &&
          t.x + t.width <= destination.x + destination.width + 0.001 &&
          t.y + t.height <= destination.y + destination.height + 0.001;
        assert.ok(fits, `${JSON.stringify(t)} does not fit on ${JSON.stringify(destination)}`);
      }
    }
  });

  test('a window against all four edges reports that it touches all edges', () => {
    assert.equal(transferredRect(laptop, laptop, external, 4).touchesAllEdges, true);
    assert.equal(transferredRect(rect(0, 0, 756, 945), laptop, external, 4).touchesAllEdges, false);
  });
});

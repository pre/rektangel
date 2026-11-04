import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fixedSizeFrame, moveInside } from '../src/fixed-size.js';
import { rect } from './fixtures.js';

const workArea = rect(0, 27, 3008, 1665);

describe('fixedSizeFrame', () => {
  test('keeps to the left edge when the zone touches only the left edge', () => {
    const zone = rect(0, 27, 1504, 1665);

    const frame = fixedSizeFrame(800, 600, zone, workArea);

    assert.deepEqual(frame, rect(0, 560, 800, 600));
  });

  test('keeps to the right and bottom edges of a bottom-right zone', () => {
    const zone = rect(1504, 860, 1504, 832);

    const frame = fixedSizeFrame(800, 600, zone, workArea);

    assert.deepEqual(frame, rect(2208, 1092, 800, 600));
  });

  test('centers in a zone that touches both edges of an axis', () => {
    const frame = fixedSizeFrame(800, 600, workArea, workArea);

    assert.deepEqual(frame, rect(1104, 560, 800, 600));
  });

  test('keeps the zone start when the size differs by one pixel or less', () => {
    const zone = rect(0, 27, 801, 1665);

    const frame = fixedSizeFrame(800, 600, zone, workArea);

    assert.equal(frame.x, 0);
  });

  test('moves the window back into the work area', () => {
    const zone = rect(2900, 27, 200, 1665);

    const frame = fixedSizeFrame(800, 600, zone, workArea);

    assert.deepEqual(frame, rect(2208, 560, 800, 600));
  });
});

describe('moveInside', () => {
  test('starts a side that is larger than the bounds at the bounds', () => {
    const frame = moveInside(rect(-50, 0, 4000, 300), workArea);

    assert.deepEqual(frame, rect(0, 27, 4000, 300));
  });
});

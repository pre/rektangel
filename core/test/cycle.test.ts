import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cycleFraction, sortedCycleSizes } from '../src/cycle.js';
import { defaultConfig } from '../src/index.js';

const rect = { x: 0, y: 0, width: 1, height: 1 };

describe('sortedCycleSizes', () => {
  test('starts with one half, then the larger sizes, then the smaller sizes', () => {
    const sizes = sortedCycleSizes([1 / 4, 1 / 3, 3 / 4, 1 / 2, 2 / 3]);

    assert.deepEqual(sizes, [1 / 2, 2 / 3, 3 / 4, 1 / 4, 1 / 3]);
  });
});

describe('cycleFraction', () => {
  test('the first press gives one half', () => {
    assert.equal(cycleFraction('left-half', undefined, defaultConfig.cycleSizes), 1 / 2);
  });

  test('repeated presses cycle one half, two thirds, one third', () => {
    const fractions = [1, 2, 3, 4].map((count) =>
      cycleFraction('left-half', { action: 'left-half', rect, count }, defaultConfig.cycleSizes),
    );

    assert.deepEqual(fractions, [2 / 3, 1 / 3, 1 / 2, 2 / 3]);
  });

  test('a different last action starts the cycle again', () => {
    const fraction = cycleFraction('left-half', { action: 'right-half', rect, count: 1 }, defaultConfig.cycleSizes);

    assert.equal(fraction, 1 / 2);
  });

  test('without one half in the sizes, the second press gives the first size', () => {
    const fractions = [1, 2, 3].map((count) =>
      cycleFraction('left-half', { action: 'left-half', rect, count }, [2 / 3, 1 / 3]),
    );

    assert.deepEqual(fractions, [2 / 3, 1 / 3, 2 / 3]);
  });

  test('no cycle sizes always give one half', () => {
    const fraction = cycleFraction('left-half', { action: 'left-half', rect, count: 1 }, []);

    assert.equal(fraction, 1 / 2);
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cycleOrderLabel, cycleSizesFromSetting } from '../src/cycle-sizes.ts';

describe('cycleSizesFromSetting', () => {
  test('gives one half and the selected sizes', () => {
    assert.deepEqual(cycleSizesFromSetting(['2/3', '1/3']), [1 / 3, 1 / 2, 2 / 3]);
  });

  test('gives only one half when no size is selected', () => {
    assert.deepEqual(cycleSizesFromSetting([]), [1 / 2]);
  });

  test('ignores a value that is not a choice', () => {
    assert.deepEqual(cycleSizesFromSetting(['3/4', '5/6']), [1 / 2, 3 / 4]);
  });
});

describe('cycleOrderLabel', () => {
  test('gives the default order: one half, larger, smaller, then one half again', () => {
    assert.equal(cycleOrderLabel(['1/3', '2/3']), '1/2 → 2/3 → 1/3 → 1/2');
  });

  test('puts the larger sizes before the smaller sizes, each going up', () => {
    assert.equal(cycleOrderLabel(['1/4', '1/3', '2/3', '3/4']), '1/2 → 2/3 → 3/4 → 1/4 → 1/3 → 1/2');
  });

  test('tells that the size does not change when no size is selected', () => {
    assert.equal(cycleOrderLabel([]), 'Always 1/2');
  });
});

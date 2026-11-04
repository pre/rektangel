import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampRect, monitorForRect, rectCenter, rectEquals, rectsIntersect } from '../src/index.js';
import { singleMonitor } from './fixtures.js';

const bounds = { x: 0, y: 0, width: 100, height: 100 };

test('rectEquals compares all four fields', () => {
  assert.equal(rectEquals(bounds, { ...bounds }), true);
  assert.equal(rectEquals(bounds, { ...bounds, width: 99 }), false);
});

test('rectsIntersect is false for rectangles that only touch', () => {
  assert.equal(rectsIntersect(bounds, { x: 50, y: 50, width: 100, height: 100 }), true);
  assert.equal(rectsIntersect(bounds, { x: 100, y: 0, width: 10, height: 10 }), false);
});

test('rectCenter returns the middle point', () => {
  assert.deepEqual(rectCenter({ x: 10, y: 20, width: 100, height: 50 }), { x: 60, y: 45 });
});

test('clampRect moves a rectangle back inside the bounds', () => {
  assert.deepEqual(clampRect({ x: 80, y: -10, width: 40, height: 40 }, bounds), { x: 60, y: 0, width: 40, height: 40 });
});

test('clampRect shrinks a rectangle that is larger than the bounds', () => {
  assert.deepEqual(clampRect({ x: -5, y: 5, width: 300, height: 50 }, bounds), { x: 0, y: 5, width: 100, height: 50 });
});

test('monitorForRect finds the monitor that contains the center', () => {
  assert.equal(monitorForRect({ x: 10, y: 10, width: 10, height: 10 }, [singleMonitor]), singleMonitor);
  assert.equal(monitorForRect({ x: -50, y: 10, width: 10, height: 10 }, [singleMonitor]), undefined);
});

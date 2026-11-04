import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { adjacentMonitors, orderedMonitors } from '../src/calculations/display.js';
import { execute, type Monitor } from '../src/index.js';
import { input, rect, rightMonitor, singleMonitor, twoMonitors } from './fixtures.js';
import { press } from './run.js';

const monitor = (index: number, x: number, y: number): Monitor => ({
  index,
  geometry: rect(x, y, 1920, 1080),
  workArea: rect(x, y, 1920, 1080),
});

describe('monitor order (Rectangle screensOrderedByX = yThenMinX)', () => {
  test('a monitor above comes first, then the monitors from left to right', () => {
    const right = monitor(0, 1920, 0);
    const left = monitor(1, 0, 0);
    const above = monitor(2, 0, -1080);

    const order = orderedMonitors([right, left, above]).map((m) => m.index);

    assert.deepEqual(order, [2, 1, 0]);
  });

  test('with three monitors, next and previous wrap around', () => {
    const monitors = [monitor(0, 0, 0), monitor(1, 1920, 0), monitor(2, 3840, 0)];

    assert.deepEqual(adjacentMonitors(monitors[2]!, monitors), { previous: monitors[1], next: monitors[0] });
    assert.deepEqual(adjacentMonitors(monitors[0]!, monitors), { previous: monitors[2], next: monitors[1] });
  });

  test('with two monitors, next and previous are the other monitor', () => {
    assert.deepEqual(adjacentMonitors(singleMonitor, twoMonitors), { previous: rightMonitor, next: rightMonitor });
  });

  test('with one monitor there is no adjacent monitor', () => {
    assert.equal(adjacentMonitors(singleMonitor, [singleMonitor]), undefined);
  });
});

describe('next and previous display', () => {
  test('a left half stays on the left edge and keeps its width', () => {
    const result = execute(input({ action: 'next-display', frame: rect(0, 27, 1504, 1665), monitors: twoMonitors }));

    assert.deepEqual(result.change, { frame: rect(3008, 0, 1504, 1080), monitorIndex: 1 });
  });

  test('a maximized window fills the other work area and is recorded as maximize', () => {
    const result = execute(input({ action: 'next-display', frame: singleMonitor.workArea, monitors: twoMonitors }));

    assert.deepEqual(result.change, { frame: rightMonitor.workArea, monitorIndex: 1 });
    assert.equal(result.history?.lastAction?.action, 'maximize');
  });

  test('a floating window keeps its size and its relative position', () => {
    const result = execute(input({ action: 'previous-display', frame: rect(1104, 560, 800, 600), monitors: twoMonitors }));

    assert.deepEqual(result.change, { frame: rect(3568, 240, 800, 600), monitorIndex: 1 });
  });

  test('next display twice brings a half back to where it was', () => {
    const frames = press(['left-half', 'next-display', 'next-display'], { monitors: twoMonitors });

    assert.deepEqual(frames[2], frames[0]);
  });

  test('with one monitor nothing changes', () => {
    const result = execute(input({ action: 'next-display' }));

    assert.equal(result.change, null);
  });
});

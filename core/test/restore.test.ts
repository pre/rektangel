import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { execute } from '../src/index.js';
import { input, rect, singleMonitor, twoMonitors } from './fixtures.js';
import { press } from './run.js';

describe('restore', () => {
  test('returns to the frame before the first action of a chain', () => {
    const frames = press(['left-half', 'left-half', 'top-right', 'center', 'restore']);

    assert.deepEqual(frames.at(-1), rect(100, 200, 800, 600));
  });

  test('returns to the monitor of the restore frame', () => {
    const start = rect(100, 200, 800, 600);

    const frames = press(['maximize', 'next-display', 'restore'], { frame: start, monitors: twoMonitors });

    assert.deepEqual(frames, [rect(0, 27, 3008, 1665), rect(3008, 0, 1920, 1080), start]);
  });

  test('moves the restore frame into the current monitor when its monitor is gone', () => {
    const onUnpluggedMonitor = rect(3500, 100, 800, 600);
    const history = { restoreRect: onUnpluggedMonitor };

    const result = execute(input({ action: 'restore', frame: rect(0, 27, 1504, 1665), history }));

    assert.deepEqual(result.change, { frame: rect(2208, 100, 800, 600), monitorIndex: singleMonitor.index });
  });

  test('a second restore does nothing', () => {
    const frames = press(['maximize', 'restore', 'restore']);

    assert.deepEqual(frames[2], rect(100, 200, 800, 600));
  });

  test('after restore, a half starts its cycle again at one half', () => {
    const frames = press(['left-half', 'left-half', 'restore', 'left-half']);

    assert.deepEqual(frames[3], rect(0, 27, 1504, 1665));
  });
});

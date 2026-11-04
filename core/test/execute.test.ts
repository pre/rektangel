import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { execute, type Action } from '../src/index.js';
import { input, singleMonitor } from './fixtures.js';

describe('execute', () => {
  test('maximize sets the frame to the work area', () => {
    const result = execute(input({ action: 'maximize' }));

    assert.deepEqual(result.change, { frame: singleMonitor.workArea, monitorIndex: 0 });
  });

  test('unknown action returns no change and keeps the history', () => {
    const history = { restoreRect: { x: 1, y: 2, width: 3, height: 4 } };

    const result = execute(input({ action: 'no-such-action' as Action, history }));

    assert.equal(result.change, null);
    assert.equal(result.history, history);
  });

  test('first action stores the current frame as the restore frame', () => {
    const frame = { x: 100, y: 200, width: 800, height: 600 };

    const result = execute(input({ frame }));

    assert.deepEqual(result.history, {
      restoreRect: frame,
      lastAction: { action: 'maximize', rect: singleMonitor.workArea, count: 1 },
    });
  });

  test('repeated action increments the count and keeps the restore frame', () => {
    const first = execute(input({}));

    const second = execute(input({ frame: singleMonitor.workArea, history: first.history }));

    assert.equal(second.change, null);
    assert.equal(second.history?.lastAction?.count, 2);
    assert.deepEqual(second.history?.restoreRect, first.history?.restoreRect);
  });

  test('a window moved by hand gets a new restore frame and count 1', () => {
    const first = execute(input({}));
    const movedFrame = { x: 50, y: 60, width: 700, height: 500 };

    const second = execute(input({ frame: movedFrame, history: first.history }));

    assert.deepEqual(second.history?.restoreRect, movedFrame);
    assert.equal(second.history?.lastAction?.count, 1);
  });

  test('restore moves the window back to the restore frame and drops the last action', () => {
    const original = { x: 100, y: 200, width: 800, height: 600 };
    const maximized = execute(input({ frame: original }));

    const restored = execute(input({ action: 'restore', frame: singleMonitor.workArea, history: maximized.history }));

    assert.deepEqual(restored.change, { frame: original, monitorIndex: 0 });
    assert.deepEqual(restored.history, { restoreRect: original });
  });

  test('restore without history returns no change', () => {
    const result = execute(input({ action: 'restore' }));

    assert.deepEqual(result, { change: null, history: undefined });
  });

  test('a monitor index outside the monitors returns no change', () => {
    const result = execute(input({ monitorIndex: 3 }));

    assert.equal(result.change, null);
  });
});

describe('execute with a window that cannot change size', () => {
  test('maximize keeps the size and centers the window in the work area', () => {
    const frame = { x: 100, y: 200, width: 800, height: 600 };

    const result = execute(input({ action: 'maximize', frame, canResize: false }));

    assert.deepEqual(result.change, { frame: { x: 1104, y: 560, width: 800, height: 600 }, monitorIndex: 0 });
  });

  test('the recorded rect is the frame that the window really gets', () => {
    const result = execute(input({ action: 'maximize', canResize: false }));

    assert.deepEqual(result.history?.lastAction?.rect, result.change?.frame);
  });
});

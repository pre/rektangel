import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { execute } from '../src/index.js';
import { input, rect, singleMonitor } from './fixtures.js';

describe('center', () => {
  const cases = [
    { name: 'keeps the size and centers the window', frame: rect(100, 200, 800, 600), expected: rect(1104, 560, 800, 600) },
    { name: 'a window taller than the work area gets its height', frame: rect(100, 0, 800, 2000), expected: rect(1104, 27, 800, 1665) },
    { name: 'a window wider than the work area gets its width', frame: rect(-100, 200, 4000, 600), expected: rect(0, 560, 3008, 600) },
  ];
  for (const { name, frame, expected } of cases) {
    test(name, () => {
      const result = execute(input({ action: 'center', frame }));

      assert.deepEqual(result.change?.frame, expected);
    });
  }

  test('a window larger than the work area on both axes is maximized and recorded as maximize', () => {
    const result = execute(input({ action: 'center', frame: rect(-10, 0, 4000, 2000) }));

    assert.deepEqual(result.change?.frame, singleMonitor.workArea);
    assert.equal(result.history?.lastAction?.action, 'maximize');
  });

  test('a centered window does not change but the action is recorded', () => {
    const frame = rect(1104, 560, 800, 600);

    const result = execute(input({ action: 'center', frame }));

    assert.equal(result.change, null);
    assert.deepEqual(result.history?.lastAction, { action: 'center', rect: frame, count: 1 });
  });
});

describe('almost maximize', () => {
  test('is 90 percent of the work area, centered', () => {
    const result = execute(input({ action: 'almost-maximize' }));

    assert.deepEqual(result.change?.frame, rect(151, 110, 2707, 1499));
  });

  test('uses the configured ratio', () => {
    const config = { ...input({}).config, almostMaximizeRatio: 0.5 };

    const result = execute(input({ action: 'almost-maximize', config }));

    assert.deepEqual(result.change?.frame, rect(752, 443, 1504, 833));
  });
});

describe('maximize height', () => {
  test('keeps the width and the x position', () => {
    const result = execute(input({ action: 'maximize-height', frame: rect(100, 200, 800, 600) }));

    assert.deepEqual(result.change?.frame, rect(100, 27, 800, 1665));
  });

  test('a window partly off the monitor moves back into the work area', () => {
    const result = execute(input({ action: 'maximize-height', frame: rect(2800, 200, 800, 600) }));

    assert.deepEqual(result.change?.frame, rect(2208, 27, 800, 1665));
  });
});

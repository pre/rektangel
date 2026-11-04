import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { execute } from '../src/index.js';
import { input, rect } from './fixtures.js';

describe('move to edge', () => {
  const frame = rect(100, 200, 800, 600);
  const cases = [
    { action: 'move-left', expected: rect(0, 560, 800, 600) },
    { action: 'move-right', expected: rect(2208, 560, 800, 600) },
    { action: 'move-up', expected: rect(1104, 27, 800, 600) },
    { action: 'move-down', expected: rect(1104, 1092, 800, 600) },
  ] as const;
  for (const { action, expected } of cases) {
    test(`${action} keeps the size and centers on the other axis`, () => {
      const result = execute(input({ action, frame }));

      assert.deepEqual(result.change?.frame, expected);
    });
  }

  test('move-left gives a window taller than the work area the work-area height', () => {
    const result = execute(input({ action: 'move-left', frame: rect(100, 0, 800, 1800) }));

    assert.deepEqual(result.change?.frame, rect(0, 27, 800, 1665));
  });

  test('move-down gives a window wider than the work area the work-area width', () => {
    const result = execute(input({ action: 'move-down', frame: rect(-50, 200, 3100, 600) }));

    assert.deepEqual(result.change?.frame, rect(0, 1092, 3008, 600));
  });
});

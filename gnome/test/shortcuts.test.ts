import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Action, allActions } from '@rektangel/core';
import {
  findConflict,
  hasCommandModifier,
  normalizeAccelerator,
  shortcutGroups,
  shortcutLayout,
} from '../src/shortcuts.ts';

describe('shortcutGroups', () => {
  test('lists every action exactly once', () => {
    const listed = shortcutGroups.flatMap((group) => group.actions);
    assert.equal(new Set(listed).size, listed.length);
    assert.deepEqual([...listed].sort(), [...allActions].sort());
  });

  test('has the groups in display order', () => {
    assert.deepEqual(
      shortcutGroups.map((group) => group.title),
      ['Halves', 'Corners', 'Thirds', 'Size', 'Move', 'Displays', 'Other'],
    );
  });
});

describe('normalizeAccelerator', () => {
  test('sorts the modifiers and lowers the key', () => {
    assert.equal(normalizeAccelerator('<Super><Alt>F'), '<Alt><Super>f');
  });

  test('resolves modifier aliases', () => {
    assert.equal(normalizeAccelerator('<Primary><Mod1>Left'), normalizeAccelerator('<Alt><Control>Left'));
    assert.equal(normalizeAccelerator('<Ctrl>a'), '<Control>a');
  });

  test('keeps an empty accelerator empty', () => {
    assert.equal(normalizeAccelerator(''), '');
  });
});

describe('hasCommandModifier', () => {
  test('accepts Control, Alt, Super, Meta and Hyper', () => {
    for (const modifier of ['Control', 'Alt', 'Super', 'Meta', 'Hyper', 'Primary']) {
      assert.equal(hasCommandModifier(`<${modifier}>Left`), true, modifier);
    }
  });

  test('rejects a bare key and Shift only', () => {
    assert.equal(hasCommandModifier('a'), false);
    assert.equal(hasCommandModifier('<Shift>Left'), false);
  });
});

describe('findConflict', () => {
  const bindings = new Map<Action, readonly string[]>([
    [Action.LeftHalf, ['<Super><Alt>Left']],
    [Action.RightHalf, ['<Super><Alt>Right']],
    [Action.FirstThird, []],
  ]);

  test('finds the other action that uses the accelerator', () => {
    assert.equal(findConflict('<Alt><Super>left', Action.RightHalf, bindings), Action.LeftHalf);
  });

  test('ignores the action that is being changed', () => {
    assert.equal(findConflict('<Super><Alt>Left', Action.LeftHalf, bindings), null);
  });

  test('returns null for a free accelerator', () => {
    assert.equal(findConflict('<Super><Alt>Home', Action.FirstThird, bindings), null);
  });

  test('never reports a conflict for an empty accelerator', () => {
    assert.equal(findConflict('', Action.LeftHalf, new Map([[Action.FirstThird, ['']]])), null);
  });
});

describe('shortcutLayout', () => {
  const titles = shortcutLayout.map((row) => row.map((cell) => cell.map((group) => group.title)));

  test('has every group exactly once', () => {
    const listed = shortcutLayout.flat(2);
    assert.equal(new Set(listed).size, listed.length);
    assert.deepEqual(new Set(listed), new Set(shortcutGroups));
  });

  test('has two cells in each row', () => {
    assert.deepEqual(
      titles.map((row) => row.length),
      [2, 2, 2],
    );
  });

  test('stacks Displays and Other in the last cell', () => {
    assert.deepEqual(titles, [
      [['Halves'], ['Corners']],
      [['Thirds'], ['Size']],
      [['Move'], ['Displays', 'Other']],
    ]);
  });
});

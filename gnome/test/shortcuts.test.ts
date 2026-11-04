import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Action, allActions } from '@rektangel/core';
import {
  findConflict,
  hasCommandModifier,
  normalizeAccelerator,
  shortcutGroups,
  splitIntoColumns,
  type ShortcutGroup,
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

describe('splitIntoColumns', () => {
  const group = (title: string, rows: number): ShortcutGroup => ({
    title,
    actions: allActions.slice(0, rows),
  });
  const titles = (columns: readonly (readonly ShortcutGroup[])[]): string[][] =>
    columns.map((column) => column.map((g) => g.title));
  const cost = (column: readonly ShortcutGroup[]): number =>
    column.reduce((sum, g) => sum + g.actions.length + 1, 0);

  test('splits the current groups so that Thirds and Size are in different columns', () => {
    const [left, right] = splitIntoColumns(shortcutGroups);
    assert.deepEqual(titles([left, right]), [
      ['Halves', 'Corners', 'Thirds'],
      ['Size', 'Move', 'Displays', 'Other'],
    ]);
    assert.ok(Math.abs(cost(left) - cost(right)) <= 1);
  });

  test('keeps the display order, left column first', () => {
    const [left, right] = splitIntoColumns(shortcutGroups);
    assert.deepEqual([...left, ...right], [...shortcutGroups]);
  });

  test('balances by rows plus one for each title', () => {
    const groups = [group('A', 1), group('B', 1), group('C', 4)];
    assert.deepEqual(titles(splitIntoColumns(groups)), [['A', 'B'], ['C']]);
  });

  test('puts a single group in the left column', () => {
    assert.deepEqual(titles(splitIntoColumns([group('A', 3)])), [['A'], []]);
  });

  test('gives two empty columns for no groups', () => {
    assert.deepEqual(titles(splitIntoColumns([])), [[], []]);
  });

  test('gives the left column the extra row when the costs cannot be equal', () => {
    const groups = [group('A', 1), group('B', 1), group('C', 1)];
    assert.deepEqual(titles(splitIntoColumns(groups)), [['A', 'B'], ['C']]);
  });
});

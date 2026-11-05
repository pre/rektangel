import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Action, allActions } from '@rektangel/core';
import {
  checkCapture,
  findConflict,
  hasCommandModifier,
  normalizeAccelerator,
  prettyAccelLabel,
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

describe('checkCapture', () => {
  const free = (): string | null => null;

  test('stores a Caps Lock press as Super in Caps Lock mode', () => {
    assert.deepEqual(checkCapture('<Hyper>Left', 'capslock', free), { accelerator: '<Super>Left', problem: null });
    assert.deepEqual(checkCapture('<Shift><Mod3>Up', 'capslock', free), { accelerator: '<Shift><Super>Up', problem: null });
  });

  test('keeps Hyper with the Windows key as Super', () => {
    assert.deepEqual(checkCapture('<Hyper>Left', 'super', free), { accelerator: '<Hyper>Left', problem: null });
  });

  test('asks for a modifier other than Shift', () => {
    assert.equal(checkCapture('<Shift>Left', 'capslock', free).problem, 'Use at least one of Ctrl, Alt or Super.');
  });

  test('names the action that uses the shortcut, in the stored form', () => {
    const conflictOf = (accelerator: string): string | null => (accelerator === '<Super>Left' ? 'Left half' : null);
    assert.equal(checkCapture('<Hyper>Left', 'capslock', conflictOf).problem, 'Left half already uses this shortcut.');
  });

  test('accepts the empty accelerator, which disables the action', () => {
    assert.deepEqual(checkCapture('', 'capslock', free), { accelerator: '', problem: null });
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

describe('prettyAccelLabel', () => {
  test('separates the parts with a space', () => {
    assert.equal(prettyAccelLabel(['Super', 'Left']), 'Super Left');
    assert.equal(prettyAccelLabel(['Shift', 'Super', "'"]), "Shift Super '");
  });

  test('keeps the plus and minus keys as parts', () => {
    assert.equal(prettyAccelLabel(['Super', '+']), 'Super +');
    assert.equal(prettyAccelLabel(['Super', '-']), 'Super -');
  });

  test('writes BackSpace as Backspace', () => {
    assert.equal(prettyAccelLabel(['Super', 'BackSpace']), 'Super Backspace');
  });

  test('keeps the other key names', () => {
    assert.equal(prettyAccelLabel(['Alt', 'Super', 'Page Up']), 'Alt Super Page Up');
    assert.equal(prettyAccelLabel(['Super', 'Return']), 'Super Return');
  });
});

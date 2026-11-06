import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { Action, allActions } from '@rektangel/core';
import {
  acceleratorLabelParts,
  capturedAccelerator,
  checkCapture,
  effectiveAccelerator,
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

  test('lists the halves and the corners in the Up, Left, Down, Right order of their arrow keys', () => {
    const halves = shortcutGroups.find((group) => group.title === 'Halves');
    const corners = shortcutGroups.find((group) => group.title === 'Corners');
    assert.deepEqual(halves?.actions, [Action.TopHalf, Action.LeftHalf, Action.BottomHalf, Action.RightHalf]);
    assert.deepEqual(corners?.actions, [Action.TopRight, Action.TopLeft, Action.BottomLeft, Action.BottomRight]);
  });

  test('lists the thirds from one third to two thirds, with the center last', () => {
    const thirds = shortcutGroups.find((group) => group.title === 'Thirds');
    assert.deepEqual(thirds?.actions, [
      Action.FirstThird,
      Action.LastThird,
      Action.FirstTwoThirds,
      Action.LastTwoThirds,
      Action.CenterThird,
    ]);
  });

  test('lists the edges of Move in the W, A, S, D order after Center', () => {
    const move = shortcutGroups.find((group) => group.title === 'Move');
    assert.deepEqual(move?.actions, [Action.Center, Action.MoveUp, Action.MoveLeft, Action.MoveDown, Action.MoveRight]);
  });

  test('lists the next display before the previous display', () => {
    const displays = shortcutGroups.find((group) => group.title === 'Displays');
    assert.deepEqual(displays?.actions, [Action.NextDisplay, Action.PreviousDisplay]);
  });
});

describe('normalizeAccelerator', () => {
  // gnome-keys.sh has the same normalizer in jq: test/gnome-keys-normalize.sh
  // checks it with the same pairs.
  const pairs = JSON.parse(readFileSync(new URL('fixtures/accelerators.json', import.meta.url), 'utf8')) as {
    input: string;
    canonical: string;
  }[];

  test('gives the canonical form of each fixture accelerator', () => {
    for (const { input, canonical } of pairs) {
      assert.equal(normalizeAccelerator(input), canonical, input);
    }
  });
});

describe('effectiveAccelerator', () => {
  test('gives the key that Mutter grabs for Hyper, in the normalized form', () => {
    assert.equal(effectiveAccelerator('<Hyper><Shift>A', 'capslock'), '<Mod3><Shift>a');
    assert.equal(effectiveAccelerator('<Hyper><Shift>A', 'super'), '<Shift><Super>a');
  });

  test('keeps the physical keys in both modes', () => {
    for (const superKey of ['super', 'capslock'] as const) {
      assert.equal(effectiveAccelerator('<Mod4>u', superKey), '<Super>u', superKey);
      assert.equal(effectiveAccelerator('<mod3>u', superKey), '<Mod3>u', superKey);
    }
  });

  test('keeps an empty accelerator', () => {
    assert.equal(effectiveAccelerator('', 'super'), '');
  });
});

describe('hasCommandModifier', () => {
  test('accepts Control, Alt, Super, Meta, Hyper and Mod3', () => {
    for (const modifier of ['Control', 'Alt', 'Super', 'Meta', 'Hyper', 'Primary', 'Mod3', 'Mod4']) {
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

  test('stores the captured accelerator without a change', () => {
    assert.deepEqual(checkCapture('<Shift><Mod3>Up', 'capslock', free), { accelerator: '<Shift><Mod3>Up', problem: null });
    assert.deepEqual(checkCapture('<Super>Left', 'capslock', free), { accelerator: '<Super>Left', problem: null });
  });

  test('asks for a modifier other than Shift', () => {
    assert.equal(checkCapture('<Shift>Left', 'capslock', free).problem, 'Use at least one of Ctrl, Alt or Hyper.');
  });

  test('asks for only one of Caps Lock and the Windows key', () => {
    assert.equal(checkCapture('<Super><Mod3>u', 'capslock', free).problem, 'Use one of Caps Lock and the Windows key.');
  });

  test('names the action that uses the shortcut, in the stored form', () => {
    const conflictOf = (accelerator: string): string | null => (accelerator === '<Mod3>Left' ? 'Left half' : null);
    assert.equal(checkCapture('<Mod3>Left', 'capslock', conflictOf).problem, 'Left half already uses this shortcut.');
  });

  test('accepts the empty accelerator, which disables the action', () => {
    assert.deepEqual(checkCapture('', 'capslock', free), { accelerator: '', problem: null });
  });
});

describe('capturedAccelerator', () => {
  const none = { shift: false, control: false, alt: false, windows: false, capsLock: false };

  test('stores the Windows key as Super and Caps Lock as Mod3', () => {
    assert.equal(capturedAccelerator({ ...none, windows: true }, 'u'), '<Super>u');
    assert.equal(capturedAccelerator({ ...none, capsLock: true }, 'u'), '<Mod3>u');
  });

  test('puts the modifiers in the order Shift, Control, Alt, Super, Mod3', () => {
    const all = { shift: true, control: true, alt: true, windows: true, capsLock: true };
    assert.equal(capturedAccelerator(all, 'Left'), '<Shift><Control><Alt><Super><Mod3>Left');
  });

  test('gives the bare key when no modifier is held', () => {
    assert.equal(capturedAccelerator(none, 'Left'), 'Left');
  });
});

describe('findConflict', () => {
  const bindings = new Map<Action, readonly string[]>([
    [Action.LeftHalf, ['<Super><Alt>Left']],
    [Action.RightHalf, ['<Super><Alt>Right']],
    [Action.FirstThird, []],
  ]);

  test('finds the other action that uses the accelerator', () => {
    assert.equal(findConflict('<Alt><super>Left', Action.RightHalf, bindings, 'capslock'), Action.LeftHalf);
  });

  test('ignores the action that is being changed', () => {
    assert.equal(findConflict('<Super><Alt>Left', Action.LeftHalf, bindings, 'super'), null);
  });

  test('returns null for a free accelerator', () => {
    assert.equal(findConflict('<Super><Alt>Home', Action.FirstThird, bindings, 'super'), null);
  });

  test('never reports a conflict for an empty accelerator', () => {
    assert.equal(findConflict('', Action.LeftHalf, new Map([[Action.FirstThird, ['']]]), 'super'), null);
  });

  test('compares the keys that Mutter grabs for Hyper', () => {
    const hyper = new Map<Action, readonly string[]>([[Action.FirstThird, ['<Hyper>1']]]);
    assert.equal(findConflict('<Mod3>1', Action.LastThird, hyper, 'capslock'), Action.FirstThird);
    assert.equal(findConflict('<Super>1', Action.LastThird, hyper, 'capslock'), null);
    assert.equal(findConflict('<Super>1', Action.LastThird, hyper, 'super'), Action.FirstThird);
    assert.equal(findConflict('<Mod3>1', Action.LastThird, hyper, 'super'), null);
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

describe('acceleratorLabelParts', () => {
  test('names the three Rektangel modifier tokens', () => {
    assert.deepEqual(acceleratorLabelParts('<Hyper>Left'), { modifiers: ['Hyper'], key: 'Left' });
    assert.deepEqual(acceleratorLabelParts('<Super>u'), { modifiers: ['Windows'], key: 'u' });
    assert.deepEqual(acceleratorLabelParts('<Mod4>u'), { modifiers: ['Windows'], key: 'u' });
    assert.deepEqual(acceleratorLabelParts('<Mod3>u'), { modifiers: ['Caps Lock'], key: 'u' });
  });

  test('names Shift, Ctrl, Alt and Meta with their aliases', () => {
    assert.deepEqual(acceleratorLabelParts('<Shift><Control><Alt><Meta>a'), {
      modifiers: ['Shift', 'Ctrl', 'Alt', 'Meta'],
      key: 'a',
    });
    assert.deepEqual(acceleratorLabelParts('<Primary><Mod1>BackSpace'), { modifiers: ['Ctrl', 'Alt'], key: 'BackSpace' });
  });

  test('ignores the case of the token', () => {
    assert.deepEqual(acceleratorLabelParts('<hyper><shift>Up'), { modifiers: ['Hyper', 'Shift'], key: 'Up' });
  });

  test('keeps the order of the tokens and names each modifier once', () => {
    assert.deepEqual(acceleratorLabelParts('<Mod3><Control><Primary>1'), { modifiers: ['Caps Lock', 'Ctrl'], key: '1' });
  });

  test('gives no modifiers for a bare key', () => {
    assert.deepEqual(acceleratorLabelParts('F1'), { modifiers: [], key: 'F1' });
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

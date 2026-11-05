import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Action } from '@rektangel/core';
import {
  addBackupRecord,
  conflictSections,
  conflictWording,
  findGnomeConflicts,
  rowConflicts,
  schemaShortName,
  schemaTitle,
  withoutAccelerator,
  type KeybindingTables,
} from '../src/gnome-conflicts.ts';

const tables: KeybindingTables = new Map([
  [
    'org.gnome.desktop.wm.keybindings',
    new Map([
      ['switch-to-workspace-left', ['<Super>Page_Up', '<Super><Alt>Left']],
      ['close', ['<Alt>F4']],
    ]),
  ],
  ['org.gnome.shell.keybindings', new Map([['shift-overview-up', ['<Alt><Super>Up']]])],
  ['org.gnome.mutter.keybindings', new Map([['toggle-tiled-left', []]])],
]);

describe('findGnomeConflicts', () => {
  test('finds a key with the same accelerator in another modifier order and case', () => {
    assert.deepEqual(findGnomeConflicts('<Alt><Super>left', tables), [
      { schema: 'org.gnome.desktop.wm.keybindings', key: 'switch-to-workspace-left' },
    ]);
  });

  test('finds keys in every schema', () => {
    const both: KeybindingTables = new Map([
      ['a.b', new Map([['one', ['<Control>x']]])],
      ['c.d', new Map([['two', ['<Primary>X']]])],
    ]);
    assert.deepEqual(findGnomeConflicts('<Ctrl>x', both), [
      { schema: 'a.b', key: 'one' },
      { schema: 'c.d', key: 'two' },
    ]);
  });

  test('returns nothing for a free accelerator', () => {
    assert.deepEqual(findGnomeConflicts('<Super><Alt>e', tables), []);
  });

  test('returns nothing for an empty accelerator', () => {
    assert.deepEqual(findGnomeConflicts('', new Map([['a.b', new Map([['one', ['']]])]])), []);
  });
});

describe('withoutAccelerator', () => {
  test('removes only the matching entry', () => {
    assert.deepEqual(withoutAccelerator(['<Super>Page_Up', '<Super><Alt>Left'], '<Alt><Super>Left'), [
      '<Super>Page_Up',
    ]);
  });
});

describe('addBackupRecord', () => {
  test('adds a record in the format of gnome-keys.sh', () => {
    assert.deepEqual(addBackupRecord({}, 'a.b', 'one', ['<Control>x'], false), {
      'a.b': { one: { value: ['<Control>x'], user_set: false } },
    });
  });

  test('keeps the first value of a key that has a record', () => {
    const backup = { 'a.b': { one: { value: ['<Control>x', '<Alt>y'], user_set: false } } };
    assert.deepEqual(addBackupRecord(backup, 'a.b', 'one', ['<Alt>y'], true), backup);
  });

  test('keeps the other records', () => {
    const backup = { 'a.b': { one: { value: [], user_set: true } } };
    assert.deepEqual(addBackupRecord(backup, 'a.b', 'two', ['<Alt>y'], false), {
      'a.b': { one: { value: [], user_set: true }, two: { value: ['<Alt>y'], user_set: false } },
    });
  });
});

describe('schemaShortName', () => {
  test('removes the common parts of the schema id', () => {
    assert.equal(schemaShortName('org.gnome.desktop.wm.keybindings'), 'Window Manager');
    assert.equal(schemaShortName('org.gnome.shell.keybindings'), 'Shell');
    assert.equal(schemaShortName('org.gnome.settings-daemon.plugins.media-keys'), 'Media Keys');
    assert.equal(schemaShortName('org.example.other'), 'org.example.other');
  });
});

describe('schemaTitle', () => {
  test('names a keybindings schema with the word keybindings', () => {
    assert.equal(schemaTitle('org.gnome.mutter.keybindings'), 'Mutter keybindings');
    assert.equal(schemaTitle('org.gnome.desktop.wm.keybindings'), 'Window Manager keybindings');
  });

  test('uses the short name for the media keys schema', () => {
    assert.equal(schemaTitle('org.gnome.settings-daemon.plugins.media-keys'), 'Media Keys');
  });

  test('keeps an unknown schema id', () => {
    assert.equal(schemaTitle('org.example.keybindings'), 'org.example.keybindings');
  });
});

describe('rowConflicts', () => {
  const gnome: KeybindingTables = new Map([
    ['org.gnome.mutter.keybindings', new Map([['toggle-tiled-left', ['<Super>Left']]])],
    ['org.gnome.shell.keybindings', new Map([['toggle-overview', ['<Super>Left', '<Super>s']]])],
  ]);

  test('lists every GNOME key that uses the accelerator of the action', () => {
    const bindings = new Map([[Action.LeftHalf, ['<super>left']]]);
    assert.deepEqual(rowConflicts(Action.LeftHalf, bindings, gnome), [
      { kind: 'gnome', schema: 'org.gnome.mutter.keybindings', key: 'toggle-tiled-left', accelerator: '<super>left' },
      { kind: 'gnome', schema: 'org.gnome.shell.keybindings', key: 'toggle-overview', accelerator: '<super>left' },
    ]);
  });

  test('lists the other Rektangel actions with the same accelerator', () => {
    const bindings = new Map([
      [Action.Center, ['<Super>Return']],
      [Action.Maximize, ['<Super>Up']],
      [Action.MaximizeHeight, ['<Shift><Super>Up', '<Super>return']],
    ]);
    assert.deepEqual(rowConflicts(Action.Center, bindings, new Map()), [
      { kind: 'rektangel', action: Action.MaximizeHeight, accelerator: '<Super>Return' },
    ]);
    assert.deepEqual(rowConflicts(Action.MaximizeHeight, bindings, new Map()), [
      { kind: 'rektangel', action: Action.Center, accelerator: '<Super>return' },
    ]);
  });

  test('returns nothing for a disabled action', () => {
    const bindings = new Map([
      [Action.LeftHalf, []],
      [Action.RightHalf, []],
    ]);
    assert.deepEqual(rowConflicts(Action.LeftHalf, bindings, gnome), []);
  });

  test('returns nothing for a free accelerator', () => {
    const bindings = new Map([
      [Action.LeftHalf, ['<Super><Alt>Left']],
      [Action.RightHalf, ['<Super>Right']],
    ]);
    assert.deepEqual(rowConflicts(Action.LeftHalf, bindings, gnome), []);
  });
});

describe('IBus emoji hotkeys', () => {
  const ibus: KeybindingTables = new Map([
    [
      'org.freedesktop.ibus.panel.emoji',
      new Map([
        ['hotkey', ['<Super>period', '<Super>semicolon']],
        ['unicode-hotkey', ['<Control><Shift>u']],
      ]),
    ],
  ]);

  test('finds the emoji hotkey that Center uses', () => {
    const bindings = new Map([[Action.Center, ['<Super>period']]]);
    assert.deepEqual(rowConflicts(Action.Center, bindings, ibus), [
      { kind: 'gnome', schema: 'org.freedesktop.ibus.panel.emoji', key: 'hotkey', accelerator: '<Super>period' },
    ]);
  });

  test('finds the unicode hotkey in another modifier order', () => {
    assert.deepEqual(findGnomeConflicts('<Shift><Control>U', ibus), [
      { schema: 'org.freedesktop.ibus.panel.emoji', key: 'unicode-hotkey' },
    ]);
  });

  test('removes the period entry and keeps the semicolon entry', () => {
    assert.deepEqual(withoutAccelerator(['<Super>period', '<Super>semicolon'], '<Super>period'), ['<Super>semicolon']);
  });

  test('names the schema IBus emoji', () => {
    assert.equal(schemaTitle('org.freedesktop.ibus.panel.emoji'), 'IBus emoji');
  });
});

describe('conflictWording', () => {
  test('says what the IBus emoji picker does with the shortcut', () => {
    assert.deepEqual(conflictWording({ schema: 'org.freedesktop.ibus.panel.emoji', key: 'hotkey' }, 'Super .'), {
      explanation:
        'IBus opens its emoji picker with this shortcut before Rektangel sees it. ' +
        'In terminals the text turns underlined until you press Esc.',
      entry: 'IBus emoji picker (Super .)',
      button: 'Turn off the IBus emoji shortcut',
    });
  });

  test('keeps the GNOME texts for the other keys', () => {
    assert.deepEqual(conflictWording({ schema: 'org.gnome.mutter.keybindings', key: 'toggle-tiled-left' }, 'Super ←'), {
      explanation: 'GNOME handles this shortcut before Rektangel. Remove it from GNOME to let Rektangel use it.',
      entry: 'Mutter keybindings › toggle-tiled-left (Super ←)',
      button: 'Remove from GNOME',
    });
  });

  test('uses the GNOME texts for the IBus unicode hotkey, which is not the emoji picker', () => {
    const wording = conflictWording({ schema: 'org.freedesktop.ibus.panel.emoji', key: 'unicode-hotkey' }, 'Ctrl+Shift+U');
    assert.equal(wording.entry, 'IBus emoji › unicode-hotkey (Ctrl+Shift+U)');
    assert.equal(wording.button, 'Remove from GNOME');
  });
});

describe('conflictSections', () => {
  const ibus = { schema: 'org.freedesktop.ibus.panel.emoji', key: 'hotkey' };
  const shell = { schema: 'org.gnome.shell.keybindings', key: 'toggle-overview' };
  const mutter = { schema: 'org.gnome.mutter.keybindings', key: 'toggle-tiled-left' };

  test('puts IBus and GNOME keys in their own sections, in the order of the keys', () => {
    const sections = conflictSections([shell, ibus, mutter], () => 'Super .');
    assert.deepEqual(
      sections.map((section) => section.entries.map((entry) => entry.binding)),
      [[shell, mutter], [ibus]],
    );
    assert.match(sections[1]?.explanation ?? '', /^IBus opens its emoji picker/);
    assert.equal(sections[1]?.entries[0]?.wording.button, 'Turn off the IBus emoji shortcut');
  });

  test('returns no sections for no keys', () => {
    assert.deepEqual(conflictSections([], () => ''), []);
  });
});

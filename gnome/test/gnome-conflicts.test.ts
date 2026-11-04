import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addBackupRecord,
  findGnomeConflicts,
  schemaShortName,
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

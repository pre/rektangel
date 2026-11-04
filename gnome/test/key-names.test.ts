import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { Action, allActions } from '@rektangel/core';
import { keyName } from '../src/key-names.ts';
import { normalizeAccelerator } from '../src/shortcuts.ts';

const schema = readFileSync(
  new URL('../schemas/org.gnome.shell.extensions.rektangel.gschema.xml', import.meta.url),
  'utf8',
);
const schemaKeys = [...schema.matchAll(/<key name="([^"]+)" type="as"/g)].map((match) => match[1]);
const schemaDefaults = [...schema.matchAll(/<default><!\[CDATA\[(\[.*\])\]\]><\/default>/g)].flatMap(
  (match) => JSON.parse((match[1] ?? '[]').replaceAll("'", '"')) as string[],
);

describe('keyName', () => {
  test('does not use the name of the Mutter maximize keybinding', () => {
    assert.equal(keyName(Action.Maximize), 'maximize-window');
  });

  test('uses the action name for the other actions', () => {
    assert.equal(keyName(Action.LeftHalf), 'left-half');
  });

  test('gives exactly the keybinding keys of the schema', () => {
    assert.deepEqual(allActions.map(keyName).sort(), [...schemaKeys].sort());
  });
});

describe('schema defaults', () => {
  test('use each accelerator once', () => {
    const normalized = schemaDefaults.map(normalizeAccelerator);
    assert.equal(schemaDefaults.length, 16);
    assert.equal(new Set(normalized).size, normalized.length);
  });
});

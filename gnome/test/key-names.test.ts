import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { Action, allActions } from '@rektangel/core';
import { keyName } from '../src/key-names.ts';

const schema = readFileSync(
  new URL('../schemas/org.gnome.shell.extensions.rektangel.gschema.xml', import.meta.url),
  'utf8',
);
const schemaKeys = [...schema.matchAll(/<key name="([^"]+)" type="as"/g)].map((match) => match[1]);

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

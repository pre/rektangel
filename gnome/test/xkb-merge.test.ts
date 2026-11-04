import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  addXkbLines,
  conflictingCapsOption,
  removeXkbLines,
  withoutXkbOption,
  withXkbOption,
  xkbOption,
} from '../src/xkb-merge.ts';

const shippedRules = readFileSync(new URL('../hyper/xkb/rules/evdev', import.meta.url), 'utf8');
const shippedList = readFileSync(new URL('../hyper/xkb/rules/evdev.lst', import.meta.url), 'utf8');
const userRules = '! include %S/evdev\n\n! option = symbols\n  my:option = +my(option)\n';

describe('addXkbLines', () => {
  test('gives the shipped file when there is no user file', () => {
    assert.equal(addXkbLines(null, shippedRules), shippedRules);
  });

  test('adds the option rule, but not the include, to a user rules file', () => {
    const merged = addXkbLines(userRules, shippedRules);
    assert.ok(merged.startsWith(userRules));
    assert.equal(merged.slice(userRules.length), '\n! option = symbols\n  rektangel:caps_hyper = +rektangel(caps_hyper)\n');
  });

  test('adds a newline to a user file that has no newline at the end', () => {
    assert.equal(addXkbLines('! option', shippedList), `! option\n\n${shippedList}`);
  });

  test('does not add the lines two times', () => {
    const merged = addXkbLines(userRules, shippedRules);
    assert.equal(addXkbLines(merged, shippedRules), merged);
  });

  test('keeps the shipped file as it is', () => {
    assert.equal(addXkbLines(shippedRules, shippedRules), shippedRules);
  });
});

describe('removeXkbLines', () => {
  test('gives null for the shipped file, so that the file is removed', () => {
    assert.equal(removeXkbLines(shippedRules, shippedRules), null);
  });

  test('gives the user file back after addXkbLines', () => {
    assert.equal(removeXkbLines(addXkbLines(userRules, shippedRules), shippedRules), userRules);
    const userList = '! layout\n  us English\n';
    assert.equal(removeXkbLines(addXkbLines(userList, shippedList), shippedList), userList);
  });

  test('keeps a user file without the Rektangel lines', () => {
    assert.equal(removeXkbLines(userRules, shippedRules), userRules);
  });

  test('keeps the other sections of the user file', () => {
    const merged = `${addXkbLines(userRules, shippedRules)}! model = keycodes\n  my = my\n`;
    assert.equal(removeXkbLines(merged, shippedRules), `${userRules}! model = keycodes\n  my = my\n`);
  });
});

describe('xkb-options', () => {
  test('finds a caps: option', () => {
    assert.equal(conflictingCapsOption(['compose:ralt', 'caps:escape']), 'caps:escape');
    assert.equal(conflictingCapsOption(['compose:ralt']), null);
  });

  test('adds the option one time and keeps the others', () => {
    assert.deepEqual(withXkbOption(['compose:ralt']), ['compose:ralt', xkbOption]);
    assert.deepEqual(withXkbOption(['compose:ralt', xkbOption]), ['compose:ralt', xkbOption]);
  });

  test('removes only the Rektangel option', () => {
    assert.deepEqual(withoutXkbOption([xkbOption, 'compose:ralt']), ['compose:ralt']);
  });
});

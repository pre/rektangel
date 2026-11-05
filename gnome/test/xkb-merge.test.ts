import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  addXkbLines,
  capsLockModeProblem,
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
  test('gives null for the shipped files, so that the files are removed', () => {
    assert.equal(removeXkbLines(shippedRules), null);
    assert.equal(removeXkbLines(shippedList), null);
  });

  test('gives null for a rules file of an older version with other comments', () => {
    const older = '// Rektangel rules, version 0\n! include %S/evdev\n\n! option = symbols\n  rektangel:caps_hyper = +rektangel(caps_hyper)\n';
    assert.equal(removeXkbLines(older), null);
  });

  test('keeps the include and the rules that the user added to the shipped file', () => {
    const added = `${shippedRules}  my:option = +my(option)\n`;
    assert.equal(removeXkbLines(added), '! include %S/evdev\n\n! option = symbols\n  my:option = +my(option)\n');
  });

  test('gives the user file back after addXkbLines', () => {
    assert.equal(removeXkbLines(addXkbLines(userRules, shippedRules)), userRules);
    const userList = '! layout\n  us English\n';
    assert.equal(removeXkbLines(addXkbLines(userList, shippedList)), userList);
  });

  test('keeps a user file without the Rektangel lines', () => {
    assert.equal(removeXkbLines(userRules), userRules);
  });

  test('keeps the other sections of the user file', () => {
    const merged = `${addXkbLines(userRules, shippedRules)}! model = keycodes\n  my = my\n`;
    assert.equal(removeXkbLines(merged), `${userRules}! model = keycodes\n  my = my\n`);
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

describe('capsLockModeProblem', () => {
  test('gives null when the option is set on Wayland', () => {
    assert.equal(capsLockModeProblem({ xkbOptions: ['compose:ralt', xkbOption], sessionType: 'wayland' }), null);
  });

  test('names the X11 session', () => {
    assert.equal(
      capsLockModeProblem({ xkbOptions: [xkbOption], sessionType: 'x11' }),
      'the X server does not read user XKB rules',
    );
  });

  test('names a caps: option that also changes Caps Lock', () => {
    assert.equal(
      capsLockModeProblem({ xkbOptions: ['caps:escape', xkbOption], sessionType: 'wayland' }),
      'xkb-options has caps:escape, which also changes Caps Lock',
    );
  });

  test('tells that the option is missing', () => {
    assert.equal(
      capsLockModeProblem({ xkbOptions: ['compose:ralt'], sessionType: 'wayland' }),
      'xkb-options does not have rektangel:caps_hyper',
    );
  });
});

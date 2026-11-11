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
  capsLockOptions,
} from '../src/xkb-merge.ts';

const xkbOption = capsLockOptions['both-shifts'];

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
    assert.equal(
      merged.slice(userRules.length),
      '\n! option = symbols\n' +
        '  rektangel:caps_hyper = +rektangel(caps_hyper)\n' +
        '  rektangel:caps_hyper_only = +rektangel(caps_hyper_only)\n' +
        '  rektangel:caps_hyper_both_shifts = +rektangel(caps_hyper_both_shifts)\n',
    );
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

  test('replaces the shipped file of an older version', () => {
    const older = '// Rektangel rules\n! include %S/evdev\n\n! option = symbols\n  rektangel:caps_hyper = +rektangel(caps_hyper)\n';
    assert.equal(addXkbLines(older, shippedRules), shippedRules);
  });

  test('replaces the lines of an older version in a user file', () => {
    const older = `${userRules}\n! option = symbols\n  rektangel:caps_hyper = +rektangel(caps_hyper)\n`;
    assert.equal(addXkbLines(older, shippedRules), addXkbLines(userRules, shippedRules));
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

  test('has one option for each Caps Lock behavior', () => {
    assert.deepEqual(capsLockOptions, {
      'both-shifts': 'rektangel:caps_hyper_both_shifts',
      'hyper-only': 'rektangel:caps_hyper_only',
      'shift-caps': 'rektangel:caps_hyper',
    });
  });

  test('adds the option one time and keeps the others', () => {
    assert.deepEqual(withXkbOption(['compose:ralt'], 'both-shifts'), ['compose:ralt', xkbOption]);
    assert.deepEqual(withXkbOption(['compose:ralt', xkbOption], 'both-shifts'), ['compose:ralt', xkbOption]);
  });

  test('replaces the option of another Caps Lock behavior', () => {
    assert.deepEqual(withXkbOption(['rektangel:caps_hyper', 'compose:ralt'], 'hyper-only'), [
      'compose:ralt',
      'rektangel:caps_hyper_only',
    ]);
  });

  test('removes only the Rektangel options', () => {
    assert.deepEqual(withoutXkbOption([xkbOption, 'compose:ralt', 'rektangel:caps_hyper']), ['compose:ralt']);
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

  test('gives null for the option of each Caps Lock behavior', () => {
    for (const option of Object.values(capsLockOptions)) {
      assert.equal(capsLockModeProblem({ xkbOptions: [option], sessionType: 'wayland' }), null);
    }
  });

  test('tells that the option is missing', () => {
    assert.equal(
      capsLockModeProblem({ xkbOptions: ['compose:ralt'], sessionType: 'wayland' }),
      'xkb-options does not have a Rektangel option',
    );
  });
});

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { migrateStoredShortcuts, migratedValues, storageVersionSetting } from '../src/migrate.ts';

describe('migratedValues', () => {
  test('replaces Super with Hyper', () => {
    const userValues = new Map([['left-half', ['<Super>Left', '<Control><Super>h']]]);
    assert.deepEqual(migratedValues(userValues), new Map([['left-half', ['<Hyper>Left', '<Control><Hyper>h']]]));
  });

  test('replaces Super in any case', () => {
    const userValues = new Map([['restore', ['<super>BackSpace', '<SUPER><Shift>u']]]);
    assert.deepEqual(migratedValues(userValues), new Map([['restore', ['<Hyper>BackSpace', '<Hyper><Shift>u']]]));
  });

  test('leaves out the values without Super', () => {
    const userValues = new Map([
      ['restore', ['<Control><Alt>BackSpace']],
      ['center', []],
      ['left-half', ['<Super>Left']],
    ]);
    assert.deepEqual(migratedValues(userValues), new Map([['left-half', ['<Hyper>Left']]]));
  });

  test('keeps the other accelerators of a changed key', () => {
    const userValues = new Map([['center', ['<Alt>c', '<Super>period']]]);
    assert.deepEqual(migratedValues(userValues), new Map([['center', ['<Alt>c', '<Hyper>period']]]));
  });
});

function fakeSettings(values: Map<string, string[]>, userSet: Set<string>, version = 0) {
  const fake = {
    values,
    version,
    writes: [] as string[],
    get_user_value: (key: string): unknown => (userSet.has(key) ? values.get(key) : null),
    get_strv: (key: string): string[] => values.get(key) ?? [],
    set_strv: (key: string, value: string[]): boolean => {
      values.set(key, value);
      fake.writes.push(key);
      return true;
    },
    get_int: (key: string): number => {
      assert.equal(key, storageVersionSetting);
      return fake.version;
    },
    set_int: (key: string, value: number): boolean => {
      assert.equal(key, storageVersionSetting);
      fake.version = value;
      return true;
    },
  };
  return fake;
}

describe('migrateStoredShortcuts', () => {
  test('rewrites only the user-set values and sets the version', () => {
    const settings = fakeSettings(
      new Map([
        ['left-half', ['<Super>Left']],
        ['restore', ['<Super>BackSpace']],
        ['center', ['<Alt>c']],
      ]),
      new Set(['left-half', 'center']),
    );
    migrateStoredShortcuts(settings, ['left-half', 'restore', 'center']);
    assert.deepEqual(settings.writes, ['left-half']);
    assert.deepEqual(settings.values.get('left-half'), ['<Hyper>Left']);
    assert.deepEqual(settings.values.get('restore'), ['<Super>BackSpace']);
    assert.equal(settings.version, 1);
  });

  test('sets the version when no value is user-set', () => {
    const settings = fakeSettings(new Map(), new Set());
    migrateStoredShortcuts(settings, ['left-half']);
    assert.deepEqual(settings.writes, []);
    assert.equal(settings.version, 1);
  });

  test('does nothing after the version is 1', () => {
    const settings = fakeSettings(new Map([['left-half', ['<Super>Left']]]), new Set(['left-half']), 1);
    migrateStoredShortcuts(settings, ['left-half']);
    assert.deepEqual(settings.writes, []);
    assert.deepEqual(settings.values.get('left-half'), ['<Super>Left']);
  });
});

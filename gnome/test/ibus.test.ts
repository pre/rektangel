import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ibusSwallowsSuperKeys, parseIbusVersion } from '../src/ibus.ts';

describe('parseIbusVersion', () => {
  test('reads the output of ibus version', () => {
    assert.deepEqual(parseIbusVersion('IBus 1.5.29-rc2\n'), [1, 5, 29]);
    assert.deepEqual(parseIbusVersion('IBus 1.5.31'), [1, 5, 31]);
  });

  test('gives null for other text', () => {
    assert.equal(parseIbusVersion(''), null);
    assert.equal(parseIbusVersion('command not found'), null);
  });
});

describe('ibusSwallowsSuperKeys', () => {
  test('is true for IBus 1.5.29 and 1.5.30 from the distribution', () => {
    assert.equal(ibusSwallowsSuperKeys([1, 5, 29], '1.5.29-2'), true);
    assert.equal(ibusSwallowsSuperKeys([1, 5, 30], '1.5.30-1'), true);
  });

  test('is true when the package version is not known', () => {
    assert.equal(ibusSwallowsSuperKeys([1, 5, 29], null), true);
  });

  test('is false for IBus 1.5.31 and later', () => {
    assert.equal(ibusSwallowsSuperKeys([1, 5, 31], '1.5.31-1'), false);
    assert.equal(ibusSwallowsSuperKeys([1, 6, 0], null), false);
    assert.equal(ibusSwallowsSuperKeys([2, 0, 0], null), false);
  });

  test('is false for a local package with the fix, version ~localN', () => {
    assert.equal(ibusSwallowsSuperKeys([1, 5, 29], '1.5.29-2ubuntu0~local1'), false);
    assert.equal(ibusSwallowsSuperKeys([1, 5, 29], '1.5.29-2ubuntu0~local12'), false);
  });

  test('is true for a package version that only has local in another place', () => {
    assert.equal(ibusSwallowsSuperKeys([1, 5, 29], '1.5.29-2ubuntu0~local'), true);
    assert.equal(ibusSwallowsSuperKeys([1, 5, 29], '1.5.29-2~local1ubuntu1'), true);
  });

  test('is false without IBus', () => {
    assert.equal(ibusSwallowsSuperKeys(null, null), false);
  });
});

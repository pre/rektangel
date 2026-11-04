import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { canonicalSuper, translateSuper } from '../src/accelerator.ts';

describe('translateSuper', () => {
  test('keeps the accelerator when the Super key is Super', () => {
    assert.equal(translateSuper('<Super><Alt>Left', 'super'), '<Super><Alt>Left');
  });

  test('replaces Super with Mod3 in Caps Lock mode', () => {
    assert.equal(translateSuper('<Control><Super>Left', 'capslock'), '<Control><Mod3>Left');
  });

  test('ignores the case of the modifier name', () => {
    assert.equal(translateSuper('<super>c', 'capslock'), '<Mod3>c');
  });

  test('keeps an accelerator without Super', () => {
    assert.equal(translateSuper('<Control><Alt>BackSpace', 'capslock'), '<Control><Alt>BackSpace');
  });

  test('keeps an empty accelerator', () => {
    assert.equal(translateSuper('', 'capslock'), '');
  });
});

describe('canonicalSuper', () => {
  test('gives Super for Mod3 and Hyper', () => {
    assert.equal(canonicalSuper('<Mod3><Shift>Up'), '<Super><Shift>Up');
    assert.equal(canonicalSuper('<hyper>f'), '<Super>f');
  });

  test('is the reverse of translateSuper', () => {
    const stored = '<Control><Shift><Super>Right';
    assert.equal(canonicalSuper(translateSuper(stored, 'capslock')), stored);
  });

  test('keeps Super and the other modifiers', () => {
    assert.equal(canonicalSuper('<Super><Alt>Left'), '<Super><Alt>Left');
  });
});

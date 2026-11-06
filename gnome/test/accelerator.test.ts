import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { translateHyper } from '../src/accelerator.ts';

describe('translateHyper', () => {
  test('gives Mod3 for Hyper in Caps Lock mode', () => {
    assert.equal(translateHyper('<Control><Hyper>Left', 'capslock'), '<Control><Mod3>Left');
  });

  test('gives Super for Hyper when the Windows key is the Hyper key', () => {
    assert.equal(translateHyper('<Hyper><Alt>Left', 'super'), '<Super><Alt>Left');
  });

  test('ignores the case of the modifier name', () => {
    assert.equal(translateHyper('<hyper>c', 'capslock'), '<Mod3>c');
    assert.equal(translateHyper('<HYPER>c', 'super'), '<Super>c');
  });

  test('keeps the physical keys Super and Mod3', () => {
    for (const superKey of ['super', 'capslock'] as const) {
      assert.equal(translateHyper('<Super>u', superKey), '<Super>u', superKey);
      assert.equal(translateHyper('<Mod3>u', superKey), '<Mod3>u', superKey);
    }
  });

  test('keeps an accelerator without Hyper', () => {
    assert.equal(translateHyper('<Control><Alt>BackSpace', 'capslock'), '<Control><Alt>BackSpace');
  });

  test('keeps an empty accelerator', () => {
    assert.equal(translateHyper('', 'capslock'), '');
  });
});

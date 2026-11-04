import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultConfig } from '@rektangel/core';
import { parseConfig } from '../src/config.ts';

describe('parseConfig', () => {
  test('gives the default config for an empty file', () => {
    const result = parseConfig('');

    assert.deepEqual(result, { config: defaultConfig });
  });

  test('reads all keys', () => {
    const text = [
      'cycle_sizes = [0.5, 0.25]',
      'step_size = 50',
      'corner_axis = "vertical"',
      'almost_maximize_ratio = 0.8',
    ].join('\n');

    const result = parseConfig(text);

    assert.equal(result.error, undefined);
    assert.deepEqual(result.config, {
      cycleSizes: [0.5, 0.25],
      stepSize: 50,
      cornerAxis: 'vertical',
      almostMaximizeRatio: 0.8,
    });
  });

  test('keeps the default for a key that is not in the file', () => {
    const result = parseConfig('step_size = 10');

    assert.deepEqual(result.config, { ...defaultConfig, stepSize: 10 });
  });

  test('does not change the default config', () => {
    parseConfig('step_size = 10\ncycle_sizes = [1]');

    assert.equal(defaultConfig.stepSize, 30);
    assert.deepEqual(defaultConfig.cycleSizes, [1 / 2, 2 / 3, 1 / 3]);
  });

  const invalid: [string, string, RegExp][] = [
    ['a syntax error', 'step_size 10', /line 2: expected "key = value"/],
    ['an unknown key', 'step-size = 10', /unknown key "step-size"/],
    ['an Object.prototype key', 'toString = 1', /unknown key "toString"/],
    ['a key in a section', 'step_size = 10\n[core]\nstep_size = 10', /unknown key "core.step_size"/],
    ['an empty cycle', 'cycle_sizes = []', /cycle_sizes must be/],
    ['a cycle size above 1', 'cycle_sizes = [0.5, 1.5]', /cycle_sizes must be/],
    ['a cycle size of 0', 'cycle_sizes = [0]', /cycle_sizes must be/],
    ['a cycle size that is not a list', 'cycle_sizes = 0.5', /cycle_sizes must be/],
    ['a fractional step', 'step_size = 2.5', /step_size must be/],
    ['a negative step', 'step_size = -30', /step_size must be/],
    ['a string step', 'step_size = "30"', /step_size must be/],
    ['an unknown corner axis', 'corner_axis = "diagonal"', /corner_axis must be/],
    ['an almost maximize ratio above 1', 'almost_maximize_ratio = 2', /almost_maximize_ratio must be/],
  ];
  for (const [name, text, message] of invalid) {
    test(`gives the default config and an error for ${name}`, () => {
      const result = parseConfig(`# config.toml\n${text}`);

      assert.equal(result.config, defaultConfig);
      assert.match(result.error ?? '', message);
    });
  }
});

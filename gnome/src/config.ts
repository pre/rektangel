import { defaultConfig, type CoreConfig } from '@rektangel/core';
import { parseToml, type TomlValue } from './toml.ts';

export interface ParsedConfig {
  config: Readonly<CoreConfig>;
  /** Set when the file has an error. Then `config` is the default config. */
  error?: string;
}

type Setter = (config: CoreConfig, value: TomlValue) => void;

/** The config.toml keys. Each key sets one CoreConfig field. */
const keys: Record<string, Setter> = {
  cycle_sizes(config, value) {
    if (!Array.isArray(value) || value.length === 0 || !value.every(isFraction)) {
      throw new Error('cycle_sizes must be a list of fractions larger than 0 and not larger than 1');
    }
    config.cycleSizes = [...value];
  },
  step_size(config, value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new Error('step_size must be a positive whole number of pixels');
    }
    config.stepSize = value;
  },
  corner_axis(config, value) {
    if (value !== 'horizontal' && value !== 'vertical') {
      throw new Error('corner_axis must be "horizontal" or "vertical"');
    }
    config.cornerAxis = value;
  },
  almost_maximize_ratio(config, value) {
    if (!isFraction(value)) {
      throw new Error('almost_maximize_ratio must be larger than 0 and not larger than 1');
    }
    config.almostMaximizeRatio = value;
  },
};

function isFraction(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && value <= 1;
}

/**
 * Makes a CoreConfig from the text of config.toml. Keys that are not in
 * the file keep their default. Any error gives the full default config,
 * so that a broken file never gives a half-applied config.
 */
export function parseConfig(text: string): ParsedConfig {
  try {
    const document = parseToml(text);
    const config: CoreConfig = { ...defaultConfig };
    for (const [table, values] of Object.entries(document)) {
      for (const [key, value] of Object.entries(values)) {
        const set = table === '' ? keys[key] : undefined;
        if (set === undefined) {
          throw new Error(`unknown key "${table === '' ? key : `${table}.${key}`}"`);
        }
        set(config, value);
      }
    }
    return { config };
  } catch (error) {
    return { config: defaultConfig, error: error instanceof Error ? error.message : String(error) };
  }
}

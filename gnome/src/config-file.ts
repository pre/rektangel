import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { defaultConfig, type CoreConfig } from '@rektangel/core';
import { parseConfig } from './config.ts';

export function configPath(): string {
  return GLib.build_filenamev([GLib.get_user_config_dir(), 'rektangel', 'config.toml']);
}

/**
 * Reads ~/.config/rektangel/config.toml. A missing file gives the default
 * config. A file with an error gives the default config and one warning.
 */
export function loadConfig(): Readonly<CoreConfig> {
  const path = configPath();
  let bytes: Uint8Array;
  try {
    [, bytes] = Gio.File.new_for_path(path).load_contents(null);
  } catch (error) {
    if (error instanceof GLib.Error && error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
      return defaultConfig;
    }
    console.warn(`Rektangel: cannot read ${path}, using the defaults: ${error}`);
    return defaultConfig;
  }

  const { config, error } = parseConfig(new TextDecoder().decode(bytes));
  if (error !== undefined) {
    console.warn(`Rektangel: ${path}: ${error}. Using the defaults.`);
  }
  return config;
}

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { SuperKey } from './accelerator.ts';
import {
  addXkbLines,
  conflictingCapsOption,
  removeXkbLines,
  withoutXkbOption,
  withXkbOption,
  xkbOption,
} from './xkb-merge.ts';

// Uses only Gio and GLib, so that the preferences process and the hyper
// scripts (through gjs) can use it. See gnome/README.md.

const xkbFiles = ['rules/evdev', 'rules/evdev.lst', 'symbols/rektangel'] as const;
const inputSourcesSchema = 'org.gnome.desktop.input-sources';

export interface XkbOptionContext {
  /** The directory that has xkb/. The default is $XDG_CONFIG_HOME. */
  readonly configDir?: string;
  /** The default is the org.gnome.desktop.input-sources settings. */
  readonly inputSources?: Gio.Settings;
  /** Only log the changes, do not do them. */
  readonly dryRun?: boolean;
  readonly log?: (line: string) => void;
}

/** True when xkb-options has rektangel:caps_hyper. */
export function isXkbOptionInstalled(inputSources?: Gio.Settings): boolean {
  return (inputSources ?? new Gio.Settings({ schema_id: inputSourcesSchema }))
    .get_strv('xkb-options')
    .includes(xkbOption);
}

/**
 * Turns on the Caps Lock key of Caps Lock mode: copies or merges the XKB
 * files of extensionPath/hyper/xkb into $XDG_CONFIG_HOME/xkb, then adds
 * rektangel:caps_hyper to xkb-options. Throws an Error, before it changes
 * something, if xkb-options has a caps: option.
 */
export function installXkbOption(extensionPath: string, context: XkbOptionContext = {}): void {
  const { inputSources, act } = resolve(context);
  const options = inputSources.get_strv('xkb-options');
  const conflict = conflictingCapsOption(options);
  if (conflict !== null) {
    throw new Error(`xkb-options has ${conflict}, which also changes Caps Lock. Remove it first.`);
  }

  // All files are read before the first write, so that a missing shipped
  // file stops the install before it changes something.
  for (const { path, text } of xkbFileWrites(extensionPath, userXkbDir(context))) {
    act(`write ${path}`, () => writeText(path, text));
  }

  if (!options.includes(xkbOption)) {
    const updated = withXkbOption(options);
    act(`set ${inputSourcesSchema} xkb-options ${JSON.stringify(updated)}`, () =>
      inputSources.set_strv('xkb-options', updated),
    );
  }
}

/**
 * Installs the XKB option when superKey is 'capslock' and xkb-options does
 * not have the option. Returns true when it installed the option. The
 * extension calls it at enable and when super-key changes, so that Caps
 * Lock, the default Super key, works without a script.
 */
export function ensureXkbOption(superKey: SuperKey, extensionPath: string, context: XkbOptionContext = {}): boolean {
  if (superKey !== 'capslock' || isXkbOptionInstalled(context.inputSources)) {
    return false;
  }
  installXkbOption(extensionPath, context);
  return true;
}

/**
 * Turns off the Caps Lock key of Caps Lock mode: removes
 * rektangel:caps_hyper from xkb-options, then removes the Rektangel lines
 * and files from $XDG_CONFIG_HOME/xkb. Other options and lines stay. The
 * directories stay, also when they are empty.
 */
export function removeXkbOption(context: XkbOptionContext = {}): void {
  const { inputSources, act } = resolve(context);
  const options = inputSources.get_strv('xkb-options');
  if (options.includes(xkbOption)) {
    const updated = withoutXkbOption(options);
    act(`set ${inputSourcesSchema} xkb-options ${JSON.stringify(updated)}`, () =>
      inputSources.set_strv('xkb-options', updated),
    );
  }

  // The files and lines are found by path and name, not by the text of
  // the shipped files, so that the files of an older version go too.
  const xkbDir = userXkbDir(context);
  for (const name of xkbFiles) {
    const path = GLib.build_filenamev([xkbDir, name]);
    const existing = readText(path);
    if (existing === null) {
      continue;
    }
    const updated = name.startsWith('symbols/') ? null : removeXkbLines(existing);
    if (updated === null) {
      act(`remove ${path}`, () => Gio.File.new_for_path(path).delete(null));
    } else if (updated !== existing) {
      act(`write ${path}`, () => writeText(path, updated));
    }
  }
}

/** The user XKB files that must change for the install, with their new text. */
function xkbFileWrites(extensionPath: string, xkbDir: string): { path: string; text: string }[] {
  return xkbFiles.flatMap((name) => {
    const shipped = readText(GLib.build_filenamev([extensionPath, 'hyper', 'xkb', name]));
    if (shipped === null) {
      throw new Error(`No ${name} in ${extensionPath}/hyper/xkb`);
    }
    const path = GLib.build_filenamev([xkbDir, name]);
    const existing = readText(path);
    const text = name.startsWith('symbols/') ? shipped : addXkbLines(existing, shipped);
    return text === existing ? [] : [{ path, text }];
  });
}

function resolve(context: XkbOptionContext) {
  const log = context.log ?? ((line: string) => console.log(`Rektangel: ${line}`));
  return {
    inputSources: context.inputSources ?? new Gio.Settings({ schema_id: inputSourcesSchema }),
    act: (description: string, change: () => void) => {
      log(context.dryRun ? `would ${description}` : description);
      if (!context.dryRun) {
        change();
      }
    },
  };
}

function userXkbDir(context: XkbOptionContext): string {
  return GLib.build_filenamev([context.configDir ?? GLib.get_user_config_dir(), 'xkb']);
}

function readText(path: string): string | null {
  try {
    const [, bytes] = Gio.File.new_for_path(path).load_contents(null);
    return new TextDecoder().decode(bytes);
  } catch (error) {
    if (error instanceof GLib.Error && error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
      return null;
    }
    throw error;
  }
}

function writeText(path: string, text: string): void {
  GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
  Gio.File.new_for_path(path).replace_contents(
    new TextEncoder().encode(text),
    null,
    false,
    Gio.FileCreateFlags.NONE,
    null,
  );
}


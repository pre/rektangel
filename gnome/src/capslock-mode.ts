import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { capsLockBehaviorSetting, superKeySetting, xkbOptionInstalledSetting } from './accelerator.ts';
import {
  addXkbLines,
  conflictingCapsOption,
  hasRektangelOption,
  removeXkbLines,
  withoutXkbOption,
  withXkbOption,
  type CapsLockBehavior,
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

/**
 * Turns on the Caps Lock key of Caps Lock mode: copies or merges the XKB
 * files of extensionPath/hyper/xkb into $XDG_CONFIG_HOME/xkb, then makes
 * the option of the behavior the only Rektangel option in xkb-options.
 * Writes only the files that are missing or different. Returns true when
 * it changed something. Throws an Error, before it changes something, if
 * xkb-options has a caps: option.
 */
export function installXkbOption(
  extensionPath: string,
  behavior: CapsLockBehavior,
  context: XkbOptionContext = {},
): boolean {
  const { inputSources, act } = resolve(context);
  const options = inputSources.get_strv('xkb-options');
  const conflict = conflictingCapsOption(options);
  if (conflict !== null) {
    throw new Error(`xkb-options has ${conflict}, which also changes Caps Lock. Remove it first.`);
  }

  // All files are read before the first write, so that a missing shipped
  // file stops the install before it changes something.
  const writes = xkbFileWrites(extensionPath, userXkbDir(context));
  for (const { path, text } of writes) {
    act(`write ${path}`, () => writeText(path, text));
  }

  const updated = withXkbOption(options, behavior);
  const changeOptions = JSON.stringify(updated) !== JSON.stringify(options);
  if (changeOptions) {
    act(`set ${inputSourcesSchema} xkb-options ${JSON.stringify(updated)}`, () =>
      inputSources.set_strv('xkb-options', updated),
    );
  }
  return writes.length > 0 || changeOptions;
}

/**
 * Makes the XKB files and option match super-key and caps-lock-behavior
 * of the Rektangel settings. Does nothing when super-key is not
 * 'capslock', or when xkb-option-installed is true and xkb-options has no
 * Rektangel option: the user removed it, for example in Tweaks. So the
 * first call installs the option, and a later call updates the files of an
 * older version and replaces the option when the behavior changed. Sets
 * xkb-option-installed. Returns true when it changed a file or the option.
 */
export function ensureXkbOption(rektangel: Gio.Settings, extensionPath: string, context: XkbOptionContext = {}): boolean {
  if (rektangel.get_string(superKeySetting) !== 'capslock') {
    return false;
  }
  const { inputSources } = resolve(context);
  if (rektangel.get_boolean(xkbOptionInstalledSetting) && !hasRektangelOption(inputSources.get_strv('xkb-options'))) {
    return false;
  }
  const changed = installXkbOption(extensionPath, capsLockBehavior(rektangel), { ...context, inputSources });
  rektangel.set_boolean(xkbOptionInstalledSetting, true);
  return changed;
}

export function capsLockBehavior(rektangel: Gio.Settings): CapsLockBehavior {
  return rektangel.get_string(capsLockBehaviorSetting) as CapsLockBehavior;
}

/**
 * Turns off the Caps Lock key of Caps Lock mode: removes the Rektangel
 * options from xkb-options, then removes the Rektangel lines
 * and files from $XDG_CONFIG_HOME/xkb. Other options and lines stay. The
 * directories stay, also when they are empty.
 */
export function removeXkbOption(context: XkbOptionContext = {}): void {
  const { inputSources, act } = resolve(context);
  const options = inputSources.get_strv('xkb-options');
  if (hasRektangelOption(options)) {
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


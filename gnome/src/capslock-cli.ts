// gjs -m hyper/capslock-mode.js install|remove [--dry-run]
// Called by hyper/install.sh and hyper/uninstall.sh. The extension
// directory is the parent of the directory of this file.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { capsLockBehavior, installXkbOption, removeXkbOption } from './capslock-mode.ts';

declare const ARGV: string[];

const [command, ...flags] = ARGV;
const dryRun = flags.includes('--dry-run');
const scriptPath = GLib.filename_from_uri(import.meta.url)[0];
const extensionPath = GLib.path_get_dirname(GLib.path_get_dirname(scriptPath));
const context = { dryRun, log: (line: string) => print(dryRun ? `Dry run: ${line}` : line) };

try {
  if (command === 'install') {
    installXkbOption(extensionPath, capsLockBehavior(rektangelSettings()), context);
  } else if (command === 'remove') {
    removeXkbOption(context);
  } else {
    throw new Error('Usage: gjs -m capslock-mode.js install|remove [--dry-run]');
  }
} catch (error) {
  printerr(error instanceof Error ? error.message : String(error));
  imports.system.exit(1);
}

/** The Rektangel settings, with the schema of the extension directory. */
function rektangelSettings(): Gio.Settings {
  const schemas = Gio.SettingsSchemaSource.new_from_directory(
    GLib.build_filenamev([extensionPath, 'schemas']),
    Gio.SettingsSchemaSource.get_default(),
    false,
  );
  const schema = schemas.lookup('org.gnome.shell.extensions.rektangel', false);
  if (schema === null) {
    throw new Error(`No compiled Rektangel schema in ${extensionPath}/schemas`);
  }
  return new Gio.Settings({ settings_schema: schema });
}

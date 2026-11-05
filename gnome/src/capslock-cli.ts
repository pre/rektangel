// gjs -m hyper/capslock-mode.js install|remove [--dry-run]
// Called by hyper/install.sh and hyper/uninstall.sh. The extension
// directory is the parent of the directory of this file.
import GLib from 'gi://GLib';
import { installXkbOption, removeXkbOption } from './capslock-mode.ts';

declare const ARGV: string[];

const [command, ...flags] = ARGV;
const dryRun = flags.includes('--dry-run');
const scriptPath = GLib.filename_from_uri(import.meta.url)[0];
const extensionPath = GLib.path_get_dirname(GLib.path_get_dirname(scriptPath));
const context = { dryRun, log: (line: string) => print(dryRun ? `Dry run: ${line}` : line) };

try {
  if (command === 'install') {
    installXkbOption(extensionPath, context);
  } else if (command === 'remove') {
    removeXkbOption(context);
  } else {
    throw new Error('Usage: gjs -m capslock-mode.js install|remove [--dry-run]');
  }
} catch (error) {
  printerr(error instanceof Error ? error.message : String(error));
  imports.system.exit(1);
}

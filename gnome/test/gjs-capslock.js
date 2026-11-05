// Run with: gjs -m test/gjs-capslock.js (after node esbuild.mjs). Checks
// the super-key translation and the XKB option steps in GJS. All settings
// use memory backends and the files go to a new temporary directory, so
// the test does not change the session.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { TranslatedSettings } from '../build/translated-settings.js';
import { ensureXkbOption, installXkbOption, removeXkbOption } from '../build/capslock-mode.js';

function check(name, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`gjs capslock test failed: ${name}: expected ${expectedJson}, got ${actualJson}`);
  }
}

function memorySettings(source, id) {
  return Gio.Settings.new_full(source.lookup(id, false), Gio.memory_settings_backend_new(), null);
}

function readFile(path) {
  return new TextDecoder().decode(Gio.File.new_for_path(path).load_contents(null)[1]);
}

function writeFile(path, text) {
  GLib.mkdir_with_parents(GLib.path_get_dirname(path), 0o755);
  GLib.file_set_contents(path, text);
}

const gnomeDir = GLib.path_get_dirname(GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]));

const schemas = Gio.SettingsSchemaSource.new_from_directory(`${gnomeDir}/dist/schemas`, null, false);
const stored = memorySettings(schemas, 'org.gnome.shell.extensions.rektangel');
const translated = new TranslatedSettings(stored, ['left-half', 'restore'], 'capslock');
check('default super-key', stored.get_string('super-key'), 'capslock');
check('capslock: left-half', translated.settings.get_strv('left-half'), ['<Mod3>Left']);
translated.setSuperKey('super');
check('super: left-half', translated.settings.get_strv('left-half'), ['<Super>Left']);
translated.setSuperKey('capslock');
check('capslock again: left-half', translated.settings.get_strv('left-half'), ['<Mod3>Left']);
check('capslock: restore', translated.settings.get_strv('restore'), ['<Mod3>BackSpace']);
stored.set_strv('restore', ['<Control><Alt>BackSpace']);
check('capslock: restore without Super', translated.settings.get_strv('restore'), ['<Control><Alt>BackSpace']);
stored.set_strv('left-half', ['<Super><Alt>Left', '<Control><Super>h']);
check('capslock: changed left-half', translated.settings.get_strv('left-half'), ['<Mod3><Alt>Left', '<Control><Mod3>h']);
translated.setSuperKey('super');
check('super again: left-half', translated.settings.get_strv('left-half'), ['<Super><Alt>Left', '<Control><Super>h']);
translated.destroy();
stored.set_strv('left-half', ['<Super>x']);
check('after destroy: no copy', translated.settings.get_strv('left-half'), ['<Super><Alt>Left', '<Control><Super>h']);

const inputSources = memorySettings(Gio.SettingsSchemaSource.get_default(), 'org.gnome.desktop.input-sources');
const configDir = GLib.dir_make_tmp('rektangel-XXXXXX');
const xkbDir = `${configDir}/xkb`;
const context = { configDir, inputSources, log: () => {} };
try {
  inputSources.set_strv('xkb-options', ['compose:ralt']);
  installXkbOption(gnomeDir, context);
  check('install: option', inputSources.get_strv('xkb-options'), ['compose:ralt', 'rektangel:caps_hyper']);
  check('install: rules', readFile(`${xkbDir}/rules/evdev`), readFile(`${gnomeDir}/hyper/xkb/rules/evdev`));
  installXkbOption(gnomeDir, context);
  check('install two times: option', inputSources.get_strv('xkb-options'), ['compose:ralt', 'rektangel:caps_hyper']);

  stored.set_string('super-key', 'capslock');
  check('ensure: installed already', ensureXkbOption(stored, gnomeDir, context), false);
  check('ensure: sets the flag', stored.get_boolean('xkb-option-installed'), true);
  stored.set_boolean('xkb-option-installed', false);
  Gio.File.new_for_path(`${xkbDir}/symbols/rektangel`).delete(null);
  check('ensure: missing file', ensureXkbOption(stored, gnomeDir, context), true);
  check('ensure: file again', readFile(`${xkbDir}/symbols/rektangel`), readFile(`${gnomeDir}/hyper/xkb/symbols/rektangel`));

  removeXkbOption(context);
  check('remove: option', inputSources.get_strv('xkb-options'), ['compose:ralt']);
  check('remove: symbols file', GLib.file_test(`${xkbDir}/symbols/rektangel`, GLib.FileTest.EXISTS), false);
  check('remove: rules file', GLib.file_test(`${xkbDir}/rules/evdev`, GLib.FileTest.EXISTS), false);

  const userRules = '! include %S/evdev\n\n! option = symbols\n  my:option = +my(option)\n';
  writeFile(`${xkbDir}/rules/evdev`, userRules);
  installXkbOption(gnomeDir, context);
  check('merge: user rule kept', readFile(`${xkbDir}/rules/evdev`).startsWith(userRules), true);
  removeXkbOption(context);
  check('merge: user rules file back', readFile(`${xkbDir}/rules/evdev`), userRules);
  check('merge: symbols removed', GLib.file_test(`${xkbDir}/symbols/rektangel`, GLib.FileTest.EXISTS), false);

  writeFile(`${xkbDir}/symbols/rektangel`, '// Rektangel symbols of an older version\n');
  writeFile(`${xkbDir}/rules/evdev.lst`, '! option\n  rektangel Rektangel, older text\n');
  removeXkbOption(context);
  check('older version: symbols removed', GLib.file_test(`${xkbDir}/symbols/rektangel`, GLib.FileTest.EXISTS), false);
  check('older version: list removed', GLib.file_test(`${xkbDir}/rules/evdev.lst`, GLib.FileTest.EXISTS), false);

  check('ensure: flag stops a second install', ensureXkbOption(stored, gnomeDir, context), false);
  check('ensure: flag keeps options', inputSources.get_strv('xkb-options'), ['compose:ralt']);
  stored.set_boolean('xkb-option-installed', false);
  stored.set_string('super-key', 'super');
  check('ensure: super does nothing', ensureXkbOption(stored, gnomeDir, context), false);
  check('ensure: super keeps options', inputSources.get_strv('xkb-options'), ['compose:ralt']);
  stored.set_string('super-key', 'capslock');
  check('ensure: capslock installs', ensureXkbOption(stored, gnomeDir, context), true);
  check('ensure: option', inputSources.get_strv('xkb-options'), ['compose:ralt', 'rektangel:caps_hyper']);
  removeXkbOption(context);

  inputSources.set_strv('xkb-options', ['caps:escape']);
  let message = '';
  try {
    installXkbOption(gnomeDir, context);
  } catch (error) {
    message = error.message;
  }
  check('caps: conflict', message.includes('caps:escape'), true);
  check('caps: conflict changes nothing', inputSources.get_strv('xkb-options'), ['caps:escape']);

  inputSources.set_strv('xkb-options', []);
  const partialExtension = `${configDir}/partial-extension`;
  writeFile(`${partialExtension}/hyper/xkb/rules/evdev`, readFile(`${gnomeDir}/hyper/xkb/rules/evdev`));
  message = '';
  try {
    installXkbOption(partialExtension, context);
  } catch (error) {
    message = error.message;
  }
  check('missing shipped file: error', message.includes('rules/evdev.lst'), true);
  check('missing shipped file: rules file kept', readFile(`${xkbDir}/rules/evdev`), userRules);
  check('missing shipped file: options', inputSources.get_strv('xkb-options'), []);

  installXkbOption(gnomeDir, { ...context, dryRun: true });
  check('dry run: option', inputSources.get_strv('xkb-options'), []);
  check('dry run: no symbols file', GLib.file_test(`${xkbDir}/symbols/rektangel`, GLib.FileTest.EXISTS), false);
} finally {
  GLib.spawn_command_line_sync(`rm -rf ${GLib.shell_quote(configDir)}`);
}

print('gjs capslock test passed: super-key translation, XKB option install and remove');

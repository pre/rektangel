import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {
  addBackupRecord,
  gnomeKeybindingSchemas,
  withoutAccelerator,
  type GnomeBinding,
  type KeybindingTables,
  type KeysBackup,
} from './gnome-conflicts.ts';

/** The settings of the GNOME keybinding schemas that are installed. */
export function gnomeKeybindingSettings(): Gio.Settings[] {
  const source = Gio.SettingsSchemaSource.get_default();
  return [...gnomeKeybindingSchemas.keys()]
    .map((id) => source?.lookup(id, true))
    .filter((schema) => schema !== null && schema !== undefined)
    .map((schema) => new Gio.Settings({ settings_schema: schema }));
}

/** Reads the `as` keys of the GNOME keybinding schemas. */
export function readGnomeKeybindings(settingsList = gnomeKeybindingSettings()): KeybindingTables {
  const tables = new Map<string, Map<string, string[]>>();
  for (const settings of settingsList) {
    const schema = settings.settings_schema;
    const keys = new Map<string, string[]>();
    for (const key of schema.list_keys()) {
      if (schema.get_key(key).get_value_type().dup_string() === 'as') {
        keys.set(key, settings.get_strv(key));
      }
    }
    tables.set(schema.get_id(), keys);
  }
  return tables;
}

export function backupPath(): string {
  return GLib.build_filenamev([GLib.get_user_config_dir(), 'rektangel', 'gnome-keys-backup.json']);
}

/**
 * Removes the accelerator from the GNOME key and keeps the other entries.
 * The old value goes to the gnome-keys.sh backup before the change, so
 * `gnome-keys.sh --undo` restores it.
 */
export function removeFromGnome(binding: GnomeBinding, accelerator: string): void {
  const settings = new Gio.Settings({ schema_id: binding.schema });
  const current = settings.get_strv(binding.key);
  const userSet = settings.get_user_value(binding.key) !== null;

  const file = Gio.File.new_for_path(backupPath());
  let backup: KeysBackup = {};
  if (file.query_exists(null)) {
    backup = JSON.parse(new TextDecoder().decode(file.load_contents(null)[1])) as KeysBackup;
  } else {
    GLib.mkdir_with_parents(GLib.path_get_dirname(backupPath()), 0o755);
  }
  backup = addBackupRecord(backup, binding.schema, binding.key, current, userSet);
  file.replace_contents(
    new TextEncoder().encode(`${JSON.stringify(backup, null, 2)}\n`),
    null,
    false,
    Gio.FileCreateFlags.NONE,
    null,
  );

  settings.set_strv(binding.key, withoutAccelerator(current, accelerator));
}

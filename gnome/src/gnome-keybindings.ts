import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {
  addBackupRecord,
  customShortcutSchema,
  gnomeKeybindingSchemas,
  mediaKeysSchema,
  staticSiblingKey,
  withoutAccelerator,
  type CustomShortcut,
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

/**
 * Makes gsd-media-keys apply a change of a `<name>-static` key. It applies
 * only a change of `<name>`, so this writes `<name>` two times and keeps its
 * value. Each write adds or removes the user value, so dconf reports both
 * writes as a change, also when the value is the default. See ADR 0018.
 */
export function applyStaticMediaKey(settings: Gio.Settings, key: string): void {
  const sibling = staticSiblingKey(settings.settings_schema.get_id(), key);
  if (sibling === null || !settings.settings_schema.has_key(sibling)) {
    return;
  }
  const value = settings.get_value(sibling);
  if (settings.get_user_value(sibling) === null) {
    settings.set_value(sibling, value);
    settings.reset(sibling);
  } else {
    settings.reset(sibling);
    settings.set_value(sibling, value);
  }
}

/** The settings of each custom shortcut of GNOME Settings, or none without gnome-settings-daemon. */
export function customShortcutSettings(): Gio.Settings[] {
  const source = Gio.SettingsSchemaSource.get_default();
  const mediaKeys = source?.lookup(mediaKeysSchema, true);
  const custom = source?.lookup(customShortcutSchema, true);
  if (!mediaKeys || !custom || !mediaKeys.has_key('custom-keybindings')) {
    return [];
  }
  return new Gio.Settings({ settings_schema: mediaKeys })
    .get_strv('custom-keybindings')
    .filter((path) => /^\/([A-Za-z0-9_-]+\/)+$/.test(path))
    .map((path) => new Gio.Settings({ settings_schema: custom, path }));
}

export function readCustomShortcuts(settingsList = customShortcutSettings()): CustomShortcut[] {
  return settingsList.map((settings) => ({ name: settings.get_string('name'), binding: settings.get_string('binding') }));
}

export function backupPath(): string {
  return GLib.build_filenamev([GLib.get_user_config_dir(), 'rektangel', 'gnome-keys-backup.json']);
}

/**
 * Removes the accelerator from the GNOME key and keeps the other entries.
 * The old value goes to the gnome-keys.sh backup before the change, so
 * `gnome-keys.sh --undo` restores it. `aboveTabKey` is the key name of the
 * key above Tab, which GNOME calls Above_Tab.
 */
export function removeFromGnome(binding: GnomeBinding, accelerator: string, aboveTabKey: string | null = null): void {
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

  settings.set_strv(binding.key, withoutAccelerator(current, accelerator, aboveTabKey));
}

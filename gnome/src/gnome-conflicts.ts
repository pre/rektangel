import { normalizeAccelerator } from './shortcuts.ts';

/** Schema id -> key -> accelerators. Only keys of type `as`. */
export type KeybindingTables = ReadonlyMap<string, ReadonlyMap<string, readonly string[]>>;

export interface GnomeBinding {
  readonly schema: string;
  readonly key: string;
}

/** The format of gnome-keys-backup.json, the same as gnome-keys.sh writes. */
export type KeysBackup = Record<string, Record<string, { value: string[]; user_set: boolean }>>;

/** The GNOME schemas that have keybindings, with a name for the user. */
export const gnomeKeybindingSchemas: ReadonlyMap<string, string> = new Map([
  ['org.gnome.desktop.wm.keybindings', 'Window Manager'],
  ['org.gnome.mutter.keybindings', 'Mutter'],
  ['org.gnome.mutter.wayland.keybindings', 'Mutter Wayland'],
  ['org.gnome.shell.keybindings', 'Shell'],
  ['org.gnome.settings-daemon.plugins.media-keys', 'Media Keys'],
]);

export function schemaShortName(schema: string): string {
  return gnomeKeybindingSchemas.get(schema) ?? schema;
}

/** The GNOME keys that have the accelerator as one of their entries. */
export function findGnomeConflicts(accelerator: string, tables: KeybindingTables): GnomeBinding[] {
  if (accelerator === '') {
    return [];
  }
  const wanted = normalizeAccelerator(accelerator);
  const conflicts: GnomeBinding[] = [];
  for (const [schema, keys] of tables) {
    for (const [key, accelerators] of keys) {
      if (accelerators.some((value) => normalizeAccelerator(value) === wanted)) {
        conflicts.push({ schema, key });
      }
    }
  }
  return conflicts;
}

export function withoutAccelerator(accelerators: readonly string[], accelerator: string): string[] {
  const wanted = normalizeAccelerator(accelerator);
  return accelerators.filter((value) => normalizeAccelerator(value) !== wanted);
}

/** Adds the old value of a key. A key that has a record keeps its first value. */
export function addBackupRecord(
  backup: KeysBackup,
  schema: string,
  key: string,
  value: readonly string[],
  userSet: boolean,
): KeysBackup {
  if (backup[schema]?.[key] !== undefined) {
    return backup;
  }
  return { ...backup, [schema]: { ...backup[schema], [key]: { value: [...value], user_set: userSet } } };
}

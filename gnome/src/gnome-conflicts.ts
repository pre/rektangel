import type { Action } from '@rektangel/core';
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
  ['org.freedesktop.ibus.panel.emoji', 'IBus emoji'],
]);

export function schemaShortName(schema: string): string {
  return gnomeKeybindingSchemas.get(schema) ?? schema;
}

/** The schema name for the preferences window, for example "Mutter keybindings". */
export function schemaTitle(schema: string): string {
  if (!gnomeKeybindingSchemas.has(schema) || !schema.endsWith('.keybindings')) {
    return schemaShortName(schema);
  }
  return `${schemaShortName(schema)} keybindings`;
}

/** A shortcut that the action shares with a GNOME key or another Rektangel action. */
export type RowConflict =
  | { readonly kind: 'gnome'; readonly schema: string; readonly key: string; readonly accelerator: string }
  | { readonly kind: 'rektangel'; readonly action: Action; readonly accelerator: string };

/**
 * The conflicts of each accelerator of the action: first the GNOME keys,
 * then the other Rektangel actions that use it.
 */
export function rowConflicts(
  action: Action,
  bindings: ReadonlyMap<Action, readonly string[]>,
  gnome: KeybindingTables,
): RowConflict[] {
  const conflicts: RowConflict[] = [];
  for (const accelerator of bindings.get(action) ?? []) {
    for (const binding of findGnomeConflicts(accelerator, gnome)) {
      conflicts.push({ kind: 'gnome', ...binding, accelerator });
    }
    const wanted = normalizeAccelerator(accelerator);
    for (const [other, accelerators] of bindings) {
      if (other !== action && accelerators.some((value) => normalizeAccelerator(value) === wanted)) {
        conflicts.push({ kind: 'rektangel', action: other, accelerator });
      }
    }
  }
  return conflicts;
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

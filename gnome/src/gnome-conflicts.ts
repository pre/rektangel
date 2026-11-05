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

/** The texts that the preferences window shows for a GNOME key that uses a Rektangel shortcut. */
export interface ConflictWording {
  /** What happens to the shortcut. The keys with the same explanation share one section. */
  readonly explanation: string;
  readonly entry: string;
  readonly button: string;
}

const ibusEmojiSchema = 'org.freedesktop.ibus.panel.emoji';

/** The IBus hotkey that opens the emoji picker. */
export function isIbusEmojiPicker(binding: GnomeBinding): boolean {
  return binding.schema === ibusEmojiSchema && binding.key === 'hotkey';
}

/** The texts for the key. `shortcut` is the display text of the accelerator, for example "Super .". */
export function conflictWording(binding: GnomeBinding, shortcut: string): ConflictWording {
  if (isIbusEmojiPicker(binding)) {
    return {
      explanation:
        'IBus opens its emoji picker with this shortcut before Rektangel sees it. ' +
        'In terminals the text turns underlined until you press Esc.',
      entry: `IBus emoji picker (${shortcut})`,
      button: 'Turn off the IBus emoji shortcut',
    };
  }
  return {
    explanation: 'GNOME handles this shortcut before Rektangel. Remove it from GNOME to let Rektangel use it.',
    entry: `${schemaTitle(binding.schema)} › ${binding.key} (${shortcut})`,
    button: 'Remove from GNOME',
  };
}

export interface ConflictSection<T extends GnomeBinding> {
  readonly explanation: string;
  readonly entries: readonly { readonly binding: T; readonly wording: ConflictWording }[];
}

/** Groups the keys by explanation, in the order of the first key of each group. */
export function conflictSections<T extends GnomeBinding>(
  bindings: readonly T[],
  shortcutOf: (binding: T) => string,
): ConflictSection<T>[] {
  const sections = new Map<string, { binding: T; wording: ConflictWording }[]>();
  for (const binding of bindings) {
    const wording = conflictWording(binding, shortcutOf(binding));
    const entries = sections.get(wording.explanation) ?? [];
    entries.push({ binding, wording });
    sections.set(wording.explanation, entries);
  }
  return [...sections].map(([explanation, entries]) => ({ explanation, entries }));
}

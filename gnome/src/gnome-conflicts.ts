import { translateHyper, type SuperKey } from './accelerator.ts';
import { effectiveAccelerator, normalizeAccelerator } from './shortcuts.ts';

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

export const mediaKeysSchema = 'org.gnome.settings-daemon.plugins.media-keys';

/**
 * For a `<name>-static` key of media-keys, the key `<name>`, else null.
 * gsd-media-keys reads both keys for one shortcut, but it applies a change
 * only when `<name>` changes (GNOME 46). See ADR 0018.
 */
export function staticSiblingKey(schema: string, key: string): string | null {
  const match = /^(.+)-static$/.exec(key);
  return schema === mediaKeysSchema && match !== null ? match[1]! : null;
}

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

/**
 * A shortcut that a row shares with a GNOME key or another Rektangel row,
 * or that IBus types as text in a window with a text input. A row is an
 * action or an app-toggles entry, with an id that is unique in the window.
 */
export type RowConflict =
  | { readonly kind: 'gnome'; readonly schema: string; readonly key: string; readonly accelerator: string }
  | { readonly kind: 'ibus'; readonly accelerator: string; readonly character: string }
  | { readonly kind: 'rektangel'; readonly id: string; readonly accelerator: string };

/** The Unicode code point of a key name, or 0 for a key that gives no character. */
export type KeyToUnicode = (keyName: string) => number;

/**
 * True when IBus types the key instead of passing the shortcut to GNOME. In
 * a window with a text input, IBus gets each key before GNOME checks the
 * shortcuts. Its simple engine types a character above U+007F, starts a
 * compose sequence for a dead key, and refuses a key only with Alt or Ctrl.
 * IBus refuses neither the Windows key (Super) nor Caps Lock (Mod3), and
 * Hyper is one of them. A key without a modifier or with Shift only, which
 * an app-toggles entry can have, has the same problem.
 */
export function ibusTypesKey(accelerator: string, keyToUnicode: KeyToUnicode): boolean {
  if (accelerator === '' || /<(Alt|Control)>/.test(normalizeAccelerator(accelerator))) {
    return false;
  }
  const key = keyOf(accelerator);
  return key.startsWith('dead_') || keyToUnicode(key) > 0x7f;
}

function keyOf(accelerator: string): string {
  return normalizeAccelerator(accelerator).replace(/<[^>]+>/g, '');
}

/** The character of the key, or the key name of a dead key, for example "dead_acute". */
export function keyCharacter(accelerator: string, keyToUnicode: KeyToUnicode): string {
  const key = keyOf(accelerator);
  const codePoint = keyToUnicode(key);
  return codePoint === 0 ? key : String.fromCodePoint(codePoint);
}

/**
 * True when a GNOME key can take the accelerator before Rektangel. No
 * GNOME key uses Caps Lock (<Mod3>), so a shortcut that Mutter grabs with
 * Caps Lock cannot conflict.
 */
export function canConflictWithGnome(accelerator: string, superKey: SuperKey): boolean {
  return !effectiveAccelerator(accelerator, superKey).includes('<Mod3>');
}

/**
 * The conflicts of each accelerator of the row: first the GNOME keys,
 * then IBus, then the other Rektangel rows that use it. A GNOME conflict
 * has the accelerator in the form that GNOME uses, <Hyper> translated.
 * Without `keyToUnicode`, no key gives a character and IBus is not checked.
 * `bindings` has the accelerators of all rows, keyed by row id.
 */
export function rowConflicts(
  id: string,
  bindings: ReadonlyMap<string, readonly string[]>,
  gnome: KeybindingTables,
  superKey: SuperKey,
  keyToUnicode: KeyToUnicode = () => 0,
): RowConflict[] {
  const conflicts: RowConflict[] = [];
  for (const accelerator of bindings.get(id) ?? []) {
    if (canConflictWithGnome(accelerator, superKey)) {
      for (const binding of findGnomeConflicts(accelerator, gnome, superKey)) {
        conflicts.push({ kind: 'gnome', ...binding, accelerator: translateHyper(accelerator, superKey) });
      }
    }
    if (ibusTypesKey(accelerator, keyToUnicode)) {
      conflicts.push({ kind: 'ibus', accelerator, character: keyCharacter(accelerator, keyToUnicode) });
    }
    const wanted = effectiveAccelerator(accelerator, superKey);
    for (const [other, accelerators] of bindings) {
      if (other !== id && accelerators.some((value) => effectiveAccelerator(value, superKey) === wanted)) {
        conflicts.push({ kind: 'rektangel', id: other, accelerator });
      }
    }
  }
  return conflicts;
}

/** The GNOME keys that have the effective form of the accelerator as one of their entries. */
export function findGnomeConflicts(accelerator: string, tables: KeybindingTables, superKey: SuperKey): GnomeBinding[] {
  if (accelerator === '') {
    return [];
  }
  const wanted = effectiveAccelerator(accelerator, superKey);
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

/**
 * Removes the entries that are the accelerator. With `aboveTabKey`, an
 * entry with Above_Tab is compared with that key name in its place.
 */
export function withoutAccelerator(
  accelerators: readonly string[],
  accelerator: string,
  aboveTabKey: string | null = null,
): string[] {
  const wanted = normalizeAccelerator(accelerator);
  return accelerators.filter((value) => normalizeAccelerator(withAboveTabKey(value, aboveTabKey)) !== wanted);
}

/**
 * GNOME calls the key above Tab Above_Tab, for example in switch-group, and
 * Mutter grabs the key that has that position on the current layout. That
 * is § on a Finnish layout. The key name comes from the keymap.
 */
function withAboveTabKey(accelerator: string, aboveTabKey: string | null): string {
  return aboveTabKey === null ? accelerator : accelerator.replace(/Above_Tab$/i, aboveTabKey);
}

/** The tables with Above_Tab replaced by the key name of the key above Tab, or the same tables for null. */
export function resolveAboveTab(tables: KeybindingTables, aboveTabKey: string | null): KeybindingTables {
  if (aboveTabKey === null) {
    return tables;
  }
  return new Map(
    [...tables].map(([schema, keys]) => [
      schema,
      new Map([...keys].map(([key, values]) => [key, values.map((value) => withAboveTabKey(value, aboveTabKey))])),
    ]),
  );
}

/**
 * The relocatable schema of the custom shortcuts of GNOME Settings. Its
 * table has the name of each shortcut as the key, because the user knows
 * the shortcut by that name, and the preferences window does not change it.
 */
export const customShortcutSchema = 'org.gnome.settings-daemon.plugins.media-keys.custom-keybinding';

/** A custom shortcut of GNOME Settings: its name and its binding of type `s`. */
export interface CustomShortcut {
  readonly name: string;
  readonly binding: string;
}

/** The table of the custom shortcuts. A second shortcut with the same name gets a number. */
export function customShortcutTable(shortcuts: readonly CustomShortcut[]): KeybindingTables {
  const keys = new Map<string, string[]>();
  for (const { name, binding } of shortcuts) {
    if (binding === '') {
      continue;
    }
    let key = name;
    for (let count = 2; keys.has(key); count++) {
      key = `${name} (${count})`;
    }
    keys.set(key, [binding]);
  }
  return new Map([[customShortcutSchema, keys]]);
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
  /** The label of the button that removes the shortcut from GNOME, or null when the window cannot remove it. */
  readonly button: string | null;
}

const ibusEmojiSchema = 'org.freedesktop.ibus.panel.emoji';

/** The heading of the preferences window for a shortcut that IBus types. */
export function ibusHeading(character: string): string {
  return `Character ${character} might be swallowed by text fields.`;
}

/** The README section with the IBus patch for Ubuntu 24.04. See ADR 0016. */
export const ibusReadmeUrl = 'https://github.com/pre/rektangel#keys-with-a-non-ascii-character';

/** The explanation under the heading, in Pango markup with a link to the README. */
export const ibusExplanationMarkup =
  'If you encounter problems, use a key with an ASCII character, or add Ctrl or Alt. ' +
  `Alternatively see <a href="${ibusReadmeUrl}">README.md</a> for instructions how to make it work.`;

/** The IBus hotkey that opens the emoji picker. */
export function isIbusEmojiPicker(binding: GnomeBinding): boolean {
  return binding.schema === ibusEmojiSchema && binding.key === 'hotkey';
}

/** The texts for the key. `shortcut` is the display text of the accelerator, for example "Windows .". */
export function conflictWording(binding: GnomeBinding, shortcut: string): ConflictWording {
  if (binding.schema === customShortcutSchema) {
    return {
      explanation:
        'A custom shortcut of GNOME Settings has this key. Only one of GNOME Settings and Rektangel can get it: ' +
        'the one that takes the key first, usually at login. ' +
        'Change it in Settings > Keyboard > View and Customize Shortcuts > Custom Shortcuts.',
      entry: `Custom shortcut › ${binding.key} (${shortcut})`,
      button: null,
    };
  }
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

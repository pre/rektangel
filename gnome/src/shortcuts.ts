import { Action } from '@rektangel/core';
import { translateHyper, type SuperKey } from './accelerator.ts';

export interface ShortcutGroup {
  readonly title: string;
  readonly actions: readonly Action[];
}

const halves: ShortcutGroup = {
  title: 'Halves',
  actions: [Action.TopHalf, Action.LeftHalf, Action.BottomHalf, Action.RightHalf],
};
const corners: ShortcutGroup = {
  title: 'Corners',
  actions: [Action.TopRight, Action.TopLeft, Action.BottomLeft, Action.BottomRight],
};
const thirds: ShortcutGroup = {
  title: 'Thirds',
  actions: [Action.FirstThird, Action.LastThird, Action.FirstTwoThirds, Action.LastTwoThirds, Action.CenterThird],
};
const size: ShortcutGroup = {
  title: 'Size',
  actions: [Action.Maximize, Action.AlmostMaximize, Action.MaximizeHeight, Action.Larger, Action.Smaller],
};
const move: ShortcutGroup = {
  title: 'Move',
  actions: [Action.Center, Action.MoveUp, Action.MoveLeft, Action.MoveDown, Action.MoveRight],
};
const displays: ShortcutGroup = { title: 'Displays', actions: [Action.NextDisplay, Action.PreviousDisplay] };
const other: ShortcutGroup = { title: 'Other', actions: [Action.Restore] };

/** The groups of the preferences window, in display order. */
export const shortcutGroups: readonly ShortcutGroup[] = [halves, corners, thirds, size, move, displays, other];

/**
 * The grid of the preferences window: rows of a left and a right cell.
 * A cell stacks its groups from top to bottom.
 */
export const shortcutLayout: readonly (readonly (readonly ShortcutGroup[])[])[] = [
  [[halves], [corners]],
  [[thirds], [size]],
  [[move], [displays, other]],
];

// gnome-keys.sh has the same table in jq. test/fixtures/accelerators.json
// checks that both give the same form.
const modifierAliases: Readonly<Record<string, string>> = {
  control: 'Control',
  ctrl: 'Control',
  ctl: 'Control',
  primary: 'Control',
  alt: 'Alt',
  mod1: 'Alt',
  super: 'Super',
  mod4: 'Super',
  shift: 'Shift',
  shft: 'Shift',
  meta: 'Meta',
  hyper: 'Hyper',
  mod3: 'Mod3',
};

/**
 * Gives one spelling for accelerators that GTK and Mutter treat as the
 * same: sorted modifiers with aliases resolved, and a key of one letter in
 * lower case. An empty string stays empty.
 */
export function normalizeAccelerator(accelerator: string): string {
  const modifiers = new Set<string>();
  const key = accelerator.trim().replace(/<([^>]+)>/g, (_, name: string) => {
    const lower = name.toLowerCase();
    modifiers.add(modifierAliases[lower] ?? lower);
    return '';
  });
  const name = key.trim();
  return [...[...modifiers].sort().map((modifier) => `<${modifier}>`), name.length === 1 ? name.toLowerCase() : name].join('');
}

/**
 * The form to compare two shortcuts, or a shortcut and a GNOME shortcut:
 * the normalized accelerator that Mutter grabs.
 */
export function effectiveAccelerator(accelerator: string, superKey: SuperKey): string {
  return normalizeAccelerator(translateHyper(accelerator, superKey));
}

/**
 * True when the accelerator has a modifier other than Shift. A global
 * shortcut without one would take a key that the user types in text.
 */
export function hasCommandModifier(accelerator: string): boolean {
  return /<(Control|Alt|Super|Meta|Hyper|Mod3)>/.test(normalizeAccelerator(accelerator));
}

/** The modifier keys that the capture dialog saw held at a key press. */
export interface HeldModifiers {
  readonly shift: boolean;
  readonly control: boolean;
  readonly alt: boolean;
  readonly windows: boolean;
  readonly capsLock: boolean;
}

/**
 * The stored form of a key press: the physical Windows key is <Super> and
 * the physical Caps Lock is <Mod3>. `key` is the keyval name of the key.
 */
export function capturedAccelerator(held: HeldModifiers, key: string): string {
  const modifiers: [boolean, string][] = [
    [held.shift, '<Shift>'],
    [held.control, '<Control>'],
    [held.alt, '<Alt>'],
    [held.windows, '<Super>'],
    [held.capsLock, '<Mod3>'],
  ];
  return modifiers.map(([isHeld, token]) => (isHeld ? token : '')).join('') + key;
}

/**
 * The accelerator to store for a key press that the capture dialog got,
 * and why it cannot be used, or null. `conflictOf` gets the stored form
 * and gives the title of the other row that uses it, or null. With
 * `plainKey`, a key without a modifier is permitted, as an app-toggles
 * entry permits it.
 */
export function checkCapture(
  accelerator: string,
  superKey: SuperKey,
  conflictOf: (accelerator: string) => string | null,
  { plainKey = false }: { plainKey?: boolean } = {},
): { accelerator: string; problem: string | null } {
  const normalized = normalizeAccelerator(accelerator);
  if (normalized.includes('<Super>') && normalized.includes('<Mod3>')) {
    return { accelerator, problem: 'Use one of Caps Lock and the Windows key.' };
  }
  if (accelerator !== '' && !plainKey && !hasCommandModifier(accelerator)) {
    return { accelerator, problem: 'Use at least one of Ctrl, Alt or Hyper.' };
  }
  const conflict = conflictOf(accelerator);
  return { accelerator, problem: conflict === null ? null : `${conflict} already uses this shortcut.` };
}

/**
 * The id of the other row that already uses the key that Mutter grabs, or
 * null. `bindings` has the accelerators of all rows, keyed by row id.
 */
export function findConflict(
  accelerator: string,
  id: string,
  bindings: ReadonlyMap<string, readonly string[]>,
  superKey: SuperKey,
): string | null {
  if (accelerator === '') {
    return null;
  }
  const wanted = effectiveAccelerator(accelerator, superKey);
  for (const [other, accelerators] of bindings) {
    if (other !== id && accelerators.some((value) => effectiveAccelerator(value, superKey) === wanted)) {
      return other;
    }
  }
  return null;
}

const modifierLabels: Readonly<Record<string, string>> = {
  hyper: 'Hyper',
  super: 'Windows',
  mod4: 'Windows',
  mod3: 'Caps Lock',
  shift: 'Shift',
  control: 'Ctrl',
  primary: 'Ctrl',
  alt: 'Alt',
  mod1: 'Alt',
  meta: 'Meta',
};

/**
 * The names of the modifiers of an accelerator, in the order of the
 * tokens, and its key token, for example "Caps Lock" and "u" for
 * <Mod3>u. An unknown modifier token keeps its name.
 */
export function acceleratorLabelParts(accelerator: string): { modifiers: string[]; key: string } {
  const modifiers = new Set<string>();
  const key = accelerator.replace(/<([^>]+)>/g, (_, name: string) => {
    modifiers.add(modifierLabels[name.toLowerCase()] ?? name);
    return '';
  });
  return { modifiers: [...modifiers], key: key.trim() };
}

/** GTK shows the keysym name for these keys. */
const keyLabelFixes: Readonly<Record<string, string>> = { BackSpace: 'Backspace' };

/**
 * The display text of an accelerator from its modifier names and the GTK
 * label of its key, for example "Super Backspace".
 */
export function prettyAccelLabel(parts: readonly string[]): string {
  return parts.map((part) => keyLabelFixes[part] ?? part).join(' ');
}

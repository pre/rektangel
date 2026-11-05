import { Action } from '@rektangel/core';
import { canonicalSuper, type SuperKey } from './accelerator.ts';

export interface ShortcutGroup {
  readonly title: string;
  readonly actions: readonly Action[];
}

const halves: ShortcutGroup = {
  title: 'Halves',
  actions: [Action.LeftHalf, Action.RightHalf, Action.TopHalf, Action.BottomHalf],
};
const corners: ShortcutGroup = {
  title: 'Corners',
  actions: [Action.TopLeft, Action.TopRight, Action.BottomLeft, Action.BottomRight],
};
const thirds: ShortcutGroup = {
  title: 'Thirds',
  actions: [Action.FirstThird, Action.CenterThird, Action.LastThird, Action.FirstTwoThirds, Action.LastTwoThirds],
};
const size: ShortcutGroup = {
  title: 'Size',
  actions: [Action.Maximize, Action.AlmostMaximize, Action.MaximizeHeight, Action.Larger, Action.Smaller],
};
const move: ShortcutGroup = {
  title: 'Move',
  actions: [Action.Center, Action.MoveLeft, Action.MoveRight, Action.MoveUp, Action.MoveDown],
};
const displays: ShortcutGroup = { title: 'Displays', actions: [Action.PreviousDisplay, Action.NextDisplay] };
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

const modifierAliases: Readonly<Record<string, string>> = {
  control: 'Control',
  ctrl: 'Control',
  ctl: 'Control',
  primary: 'Control',
  alt: 'Alt',
  mod1: 'Alt',
  super: 'Super',
  shift: 'Shift',
  shft: 'Shift',
  meta: 'Meta',
  hyper: 'Hyper',
};

/**
 * Gives one spelling for accelerators that GTK and Mutter treat as the
 * same: sorted modifiers with aliases resolved, and the key in lower case.
 * An empty string stays empty.
 */
export function normalizeAccelerator(accelerator: string): string {
  const modifiers = new Set<string>();
  const key = accelerator.trim().replace(/<([^>]+)>/g, (_, name: string) => {
    const lower = name.toLowerCase();
    modifiers.add(modifierAliases[lower] ?? lower);
    return '';
  });
  return [...[...modifiers].sort().map((name) => `<${name}>`), key.trim().toLowerCase()].join('');
}

/**
 * True when the accelerator has a modifier other than Shift. A global
 * shortcut without one would take a key that the user types in text.
 */
export function hasCommandModifier(accelerator: string): boolean {
  return /<(Control|Alt|Super|Meta|Hyper)>/.test(normalizeAccelerator(accelerator));
}

/**
 * The accelerator to store for a key press that the capture dialog got,
 * and why it cannot be used, or null. In Caps Lock mode GTK names the
 * Caps Lock modifier Hyper or Mod3, and the stored form is always Super.
 * `conflictOf` gets the stored form and gives the title of the other
 * action that uses it, or null.
 */
export function checkCapture(
  captured: string,
  superKey: SuperKey,
  conflictOf: (accelerator: string) => string | null,
): { accelerator: string; problem: string | null } {
  const accelerator = superKey === 'capslock' ? canonicalSuper(captured) : captured;
  if (accelerator !== '' && !hasCommandModifier(accelerator)) {
    return { accelerator, problem: 'Use at least one of Ctrl, Alt or Super.' };
  }
  const conflict = conflictOf(accelerator);
  return { accelerator, problem: conflict === null ? null : `${conflict} already uses this shortcut.` };
}

/** The other action that already uses the accelerator, or null. */
export function findConflict(
  accelerator: string,
  action: Action,
  bindings: ReadonlyMap<Action, readonly string[]>,
): Action | null {
  if (accelerator === '') {
    return null;
  }
  const wanted = normalizeAccelerator(accelerator);
  for (const [other, accelerators] of bindings) {
    if (other !== action && accelerators.some((value) => normalizeAccelerator(value) === wanted)) {
      return other;
    }
  }
  return null;
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

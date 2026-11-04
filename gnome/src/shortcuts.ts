import { Action } from '@rektangel/core';

export interface ShortcutGroup {
  readonly title: string;
  readonly actions: readonly Action[];
}

/** The groups of the preferences window, in display order. */
export const shortcutGroups: readonly ShortcutGroup[] = [
  { title: 'Halves', actions: [Action.LeftHalf, Action.RightHalf, Action.TopHalf, Action.BottomHalf] },
  { title: 'Corners', actions: [Action.TopLeft, Action.TopRight, Action.BottomLeft, Action.BottomRight] },
  {
    title: 'Thirds',
    actions: [Action.FirstThird, Action.CenterThird, Action.LastThird, Action.FirstTwoThirds, Action.LastTwoThirds],
  },
  {
    title: 'Size',
    actions: [Action.Maximize, Action.AlmostMaximize, Action.MaximizeHeight, Action.Larger, Action.Smaller],
  },
  { title: 'Move', actions: [Action.Center, Action.MoveLeft, Action.MoveRight, Action.MoveUp, Action.MoveDown] },
  { title: 'Displays', actions: [Action.PreviousDisplay, Action.NextDisplay] },
  { title: 'Other', actions: [Action.Restore] },
];

const columnCost = (groups: readonly ShortcutGroup[]): number =>
  groups.reduce((sum, group) => sum + group.actions.length + 1, 0);

/**
 * Splits the groups into a left and a right column of about the same
 * height. A group costs its rows plus one for its title. The left column
 * gets the first groups and the right column the rest, so that the display
 * order reads down the left column first. On a tie the left column is the
 * taller one.
 */
export function splitIntoColumns<T extends ShortcutGroup>(groups: readonly T[]): [T[], T[]] {
  const total = columnCost(groups);
  const difference = (split: number): number => Math.abs(total - 2 * columnCost(groups.slice(0, split)));
  let best = 0;
  for (let split = 1; split <= groups.length; split++) {
    if (difference(split) <= difference(best)) {
      best = split;
    }
  }
  return [groups.slice(0, best), groups.slice(best)];
}

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

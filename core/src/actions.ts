/**
 * The window actions in scope. Each value is also the gsettings key name
 * of the action's keybinding.
 */
export const Action = {
  LeftHalf: 'left-half',
  RightHalf: 'right-half',
  TopHalf: 'top-half',
  BottomHalf: 'bottom-half',
  Maximize: 'maximize',
  AlmostMaximize: 'almost-maximize',
  Center: 'center',
  MaximizeHeight: 'maximize-height',
  Larger: 'larger',
  Smaller: 'smaller',
  PreviousDisplay: 'previous-display',
  NextDisplay: 'next-display',
  TopLeft: 'top-left',
  TopRight: 'top-right',
  BottomLeft: 'bottom-left',
  BottomRight: 'bottom-right',
  Restore: 'restore',
  FirstThird: 'first-third',
  CenterThird: 'center-third',
  LastThird: 'last-third',
  FirstTwoThirds: 'first-two-thirds',
  LastTwoThirds: 'last-two-thirds',
  MoveLeft: 'move-left',
  MoveRight: 'move-right',
  MoveUp: 'move-up',
  MoveDown: 'move-down',
} as const;

export type Action = (typeof Action)[keyof typeof Action];

export const allActions: readonly Action[] = Object.values(Action);

export function isAction(value: string): value is Action {
  return (allActions as readonly string[]).includes(value);
}

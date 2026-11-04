import type { Action } from './actions.js';
import type { Rect } from './geometry.js';

/**
 * The position inside a cycle that an action reached, for example
 * `left-third` after `first-third`. The next press of the action reads it.
 */
export type SubAction =
  | 'left-third'
  | 'center-vertical-third'
  | 'right-third'
  | 'top-third'
  | 'center-horizontal-third'
  | 'bottom-third'
  | 'left-two-thirds'
  | 'right-two-thirds'
  | 'top-two-thirds'
  | 'bottom-two-thirds';

/** The last Rektangel action on a window, used for cycles and repeats. */
export interface LastAction {
  action: Action;
  /** The frame that the action gave the window. */
  rect: Rect;
  /** How many times in a row the action ran on this window, from 1. */
  count: number;
  /** The position that a cycling action reached. Only thirds use it. */
  subAction?: SubAction;
}

/** What Rektangel remembers about one window. The caller keys it by window id. */
export interface WindowHistory {
  /** The frame before the first Rektangel action, or before the last manual move. */
  restoreRect: Rect;
  lastAction?: LastAction;
}

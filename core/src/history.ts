import type { Action } from './actions.js';
import type { Rect } from './geometry.js';

/** The last Rektangel action on a window, used for cycles and repeats. */
export interface LastAction {
  action: Action;
  /** The frame that the action gave the window. */
  rect: Rect;
  /** How many times in a row the action ran on this window, from 1. */
  count: number;
}

/** What Rektangel remembers about one window. The caller keys it by window id. */
export interface WindowHistory {
  /** The frame before the first Rektangel action, or before the last manual move. */
  restoreRect: Rect;
  lastAction?: LastAction;
}

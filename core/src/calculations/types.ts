import type { Action } from '../actions.js';
import type { CoreConfig } from '../config.js';
import type { Monitor, Rect } from '../geometry.js';
import type { LastAction, SubAction } from '../history.js';

export interface CalculationInput {
  /** The action that runs. One calculation can serve more than one action. */
  action: Action;
  frame: Rect;
  /** The monitor that the window is on now. */
  monitor: Monitor;
  monitors: readonly Monitor[];
  /** The last action, or undefined when the user moved the window by hand since then. */
  lastAction: LastAction | undefined;
  config: Readonly<CoreConfig>;
}

export interface CalculationResult {
  /** The new frame. It can contain fractions; `execute` rounds it. */
  frame: Rect;
  monitorIndex: number;
  /** The action to record, when it is not the action that ran (Rectangle `resultingAction`). */
  resultingAction?: Action;
  /** The position that a cycling action reached (Rectangle `subAction`). */
  subAction?: SubAction;
}

/** Returns the new frame, or null when the action does not apply. */
export type Calculation = (input: CalculationInput) => CalculationResult | null;

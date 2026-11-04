import type { CoreConfig } from '../config.js';
import type { Monitor, Rect } from '../geometry.js';
import type { LastAction } from '../history.js';

export interface CalculationInput {
  frame: Rect;
  /** The monitor that the window is on now. */
  monitor: Monitor;
  monitors: readonly Monitor[];
  /** The last action, or undefined when the user moved the window by hand since then. */
  lastAction: LastAction | undefined;
  config: Readonly<CoreConfig>;
}

export interface CalculationResult {
  frame: Rect;
  monitorIndex: number;
}

/** Returns the new frame, or null when the action does not apply. */
export type Calculation = (input: CalculationInput) => CalculationResult | null;

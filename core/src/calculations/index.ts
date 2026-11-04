import { Action } from '../actions.js';
import { maximize } from './maximize.js';
import type { Calculation } from './types.js';

export type { Calculation, CalculationInput, CalculationResult } from './types.js';

/**
 * One calculation per action. `execute` handles `restore` itself.
 *
 * TODO(core): port the other Rectangle calculations and register them here:
 * left-half, right-half, top-half, bottom-half (LeftRightHalfCalculation,
 * TopHalfCalculation, BottomHalfCalculation with cycle sizes);
 * almost-maximize; center; maximize-height; larger, smaller
 * (ChangeSizeCalculation); previous-display, next-display
 * (NextPrevDisplayCalculation); top-left, top-right, bottom-left,
 * bottom-right (corners with CornerCycleExpansionCalculation);
 * first-third, center-third, last-third, first-two-thirds, last-two-thirds;
 * move-left, move-right, move-up, move-down.
 */
export const calculations: Partial<Record<Action, Calculation>> = {
  [Action.Maximize]: maximize,
};

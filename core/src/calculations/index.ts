import { Action } from '../actions.js';
import { bottomLeft, bottomRight, topLeft, topRight } from './corners.js';
import { bottomHalf, leftHalf, rightHalf, topHalf } from './halves.js';
import { maximize } from './maximize.js';
import type { Calculation } from './types.js';

export type { Calculation, CalculationInput, CalculationResult } from './types.js';

/** One calculation per action. `execute` handles `restore` itself. */
export const calculations: Partial<Record<Action, Calculation>> = {
  [Action.LeftHalf]: leftHalf,
  [Action.RightHalf]: rightHalf,
  [Action.TopHalf]: topHalf,
  [Action.BottomHalf]: bottomHalf,
  [Action.Maximize]: maximize,
  [Action.TopLeft]: topLeft,
  [Action.TopRight]: topRight,
  [Action.BottomLeft]: bottomLeft,
  [Action.BottomRight]: bottomRight,
};

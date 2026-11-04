import { Action } from '../actions.js';
import { bottomLeft, bottomRight, topLeft, topRight } from './corners.js';
import { bottomHalf, leftHalf, rightHalf, topHalf } from './halves.js';
import { center } from './center.js';
import { almostMaximize, maximize, maximizeHeight } from './maximize.js';
import { centerThird, firstThird, firstTwoThirds, lastThird, lastTwoThirds } from './thirds.js';
import type { Calculation } from './types.js';

export type { Calculation, CalculationInput, CalculationResult } from './types.js';

/** One calculation per action. `execute` handles `restore` itself. */
export const calculations: Partial<Record<Action, Calculation>> = {
  [Action.LeftHalf]: leftHalf,
  [Action.RightHalf]: rightHalf,
  [Action.TopHalf]: topHalf,
  [Action.BottomHalf]: bottomHalf,
  [Action.Maximize]: maximize,
  [Action.AlmostMaximize]: almostMaximize,
  [Action.MaximizeHeight]: maximizeHeight,
  [Action.Center]: center,
  [Action.TopLeft]: topLeft,
  [Action.TopRight]: topRight,
  [Action.BottomLeft]: bottomLeft,
  [Action.BottomRight]: bottomRight,
  [Action.FirstThird]: firstThird,
  [Action.CenterThird]: centerThird,
  [Action.LastThird]: lastThird,
  [Action.FirstTwoThirds]: firstTwoThirds,
  [Action.LastTwoThirds]: lastTwoThirds,
};

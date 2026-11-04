import { Action } from '../actions.js';
import { center } from './center.js';
import { larger, smaller } from './change-size.js';
import { bottomLeft, bottomRight, topLeft, topRight } from './corners.js';
import { nextDisplay, previousDisplay } from './display.js';
import { bottomHalf, leftHalf, rightHalf, topHalf } from './halves.js';
import { almostMaximize, maximize, maximizeHeight } from './maximize.js';
import { moveDown, moveLeft, moveRight, moveUp } from './move.js';
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
  [Action.Larger]: larger,
  [Action.Smaller]: smaller,
  [Action.PreviousDisplay]: previousDisplay,
  [Action.NextDisplay]: nextDisplay,
  [Action.TopLeft]: topLeft,
  [Action.TopRight]: topRight,
  [Action.BottomLeft]: bottomLeft,
  [Action.BottomRight]: bottomRight,
  [Action.FirstThird]: firstThird,
  [Action.CenterThird]: centerThird,
  [Action.LastThird]: lastThird,
  [Action.FirstTwoThirds]: firstTwoThirds,
  [Action.LastTwoThirds]: lastTwoThirds,
  [Action.MoveLeft]: moveLeft,
  [Action.MoveRight]: moveRight,
  [Action.MoveUp]: moveUp,
  [Action.MoveDown]: moveDown,
};

import { cycleFraction } from '../cycle.js';
import { horizontalRect, verticalRect, type Side } from './split.js';
import type { Calculation } from './types.js';

// Rectangle LeftRightHalfCalculation, TopHalfCalculation and
// BottomHalfCalculation with subsequentExecutionMode = resize.

function horizontalHalf(side: Side): Calculation {
  return ({ action, monitor, lastAction, config }) => ({
    frame: horizontalRect(monitor.workArea, side, cycleFraction(action, lastAction, config.cycleSizes)),
    monitorIndex: monitor.index,
  });
}

function verticalHalf(side: Side): Calculation {
  return ({ action, monitor, lastAction, config }) => ({
    frame: verticalRect(monitor.workArea, side, cycleFraction(action, lastAction, config.cycleSizes)),
    monitorIndex: monitor.index,
  });
}

export const leftHalf = horizontalHalf('start');
export const rightHalf = horizontalHalf('end');
export const topHalf = verticalHalf('start');
export const bottomHalf = verticalHalf('end');

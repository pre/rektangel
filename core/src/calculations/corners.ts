import { cycleFraction, firstCycleSize } from '../cycle.js';
import { cornerRect, type Side } from './split.js';
import type { Calculation } from './types.js';

// Rectangle UpperLeftCalculation and siblings with
// CornerCycleExpansionCalculation: a repeated press cycles the size along
// the configured axis only. The other axis stays at one half.
function corner(horizontalSide: Side, verticalSide: Side): Calculation {
  return ({ action, monitor, lastAction, config }) => {
    const fraction = cycleFraction(action, lastAction, config.cycleSizes);
    const horizontal = config.cornerAxis === 'horizontal' ? fraction : firstCycleSize;
    const vertical = config.cornerAxis === 'vertical' ? fraction : firstCycleSize;
    return {
      frame: cornerRect(monitor.workArea, horizontalSide, verticalSide, horizontal, vertical),
      monitorIndex: monitor.index,
    };
  };
}

export const topLeft = corner('start', 'start');
export const topRight = corner('end', 'start');
export const bottomLeft = corner('start', 'end');
export const bottomRight = corner('end', 'end');

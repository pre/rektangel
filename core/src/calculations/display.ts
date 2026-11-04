import type { Monitor } from '../geometry.js';
import { transferredRect } from './display-transfer.js';
import type { Calculation } from './types.js';

/**
 * Orders monitors as Rectangle `screensOrderedByX = yThenMinX`: a monitor
 * that is completely above another comes first. Monitors that overlap
 * vertically go from left to right.
 */
export function orderedMonitors(monitors: readonly Monitor[]): Monitor[] {
  return [...monitors].sort((a, b) => {
    const ga = a.geometry;
    const gb = b.geometry;
    if (ga.y + ga.height <= gb.y) return -1;
    if (gb.y + gb.height <= ga.y) return 1;
    return ga.x - gb.x;
  });
}

/** Rectangle `ScreenDetection.adjacent`: the order wraps around. */
export function adjacentMonitors(
  current: Monitor,
  monitors: readonly Monitor[],
): { previous: Monitor; next: Monitor } | undefined {
  const ordered = orderedMonitors(monitors);
  const index = ordered.findIndex((monitor) => monitor.index === current.index);
  if (ordered.length < 2 || index < 0) {
    return undefined;
  }
  return {
    previous: ordered[(index - 1 + ordered.length) % ordered.length]!,
    next: ordered[(index + 1) % ordered.length]!,
  };
}

// Rectangle NextPrevDisplayCalculation with the defaults:
// attemptMatchOnNextPrevDisplay and centerAcrossDisplays are off, so the
// window goes through DisplayTransfer. A window that touches all edges is
// maximized on the target monitor.
function displayCalculation(direction: 'previous' | 'next'): Calculation {
  return ({ frame, monitor, monitors }) => {
    const target = adjacentMonitors(monitor, monitors)?.[direction];
    if (target === undefined) {
      return null;
    }
    const { rect, touchesAllEdges } = transferredRect(frame, monitor.workArea, target.workArea);
    if (touchesAllEdges) {
      return { frame: { ...target.workArea }, monitorIndex: target.index, resultingAction: 'maximize' };
    }
    return { frame: rect, monitorIndex: target.index };
  };
}

export const previousDisplay = displayCalculation('previous');
export const nextDisplay = displayCalculation('next');

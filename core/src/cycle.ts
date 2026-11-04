import type { Action } from './actions.js';
import type { LastAction } from './history.js';

/** The size of the first press. Rectangle `CycleSize.firstSize`. */
export const firstCycleSize = 1 / 2;

const tolerance = 1e-9;

/**
 * Orders cycle sizes as Rectangle `CycleSize.sortedSizes`: one half first,
 * then the larger sizes going up, then the smaller sizes going up.
 */
export function sortedCycleSizes(sizes: readonly number[]): number[] {
  const ascending = [...sizes].sort((a, b) => a - b);
  const larger = ascending.filter((size) => size > firstCycleSize + tolerance);
  const smaller = ascending.filter((size) => size < firstCycleSize - tolerance);
  const hasFirst = ascending.length > larger.length + smaller.length;
  return [...(hasFirst ? [firstCycleSize] : []), ...larger, ...smaller];
}

/**
 * The fraction of the work area for this press of a cycling action
 * (Rectangle `RepeatedExecutionsCalculation.calculateRepeatedRect`). The
 * first press gives one half. Each repeat of the same action on an
 * unchanged window gives the next cycle size.
 */
export function cycleFraction(action: Action, lastAction: LastAction | undefined, cycleSizes: readonly number[]): number {
  const sizes = sortedCycleSizes(cycleSizes);
  if (lastAction === undefined || lastAction.action !== action || sizes.length === 0) {
    return firstCycleSize;
  }
  const startsWithFirst = sizes[0] === firstCycleSize;
  const index = startsWithFirst ? lastAction.count % sizes.length : Math.max(0, lastAction.count - 1) % sizes.length;
  return sizes[index]!;
}

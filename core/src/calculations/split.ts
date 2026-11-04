import type { Rect } from '../geometry.js';

/** `start` is the left or the top side, `end` is the right or the bottom side. */
export type Side = 'start' | 'end';

// Rectangle floors with a small tolerance, so that 1665 * 2/3 gives 1110 and not 1109.
const floorTolerance = 0.0001;

function floorDimension(value: number): number {
  return Math.floor(value + floorTolerance);
}

/** A full-height part of the work area. Rectangle `HalfSplitFrameCalculation.horizontalRect`. */
export function horizontalRect(workArea: Rect, side: Side, fraction: number): Rect {
  const width = floorDimension(workArea.width * fraction);
  const x = side === 'start' ? workArea.x : workArea.x + workArea.width - width;
  return { x, y: workArea.y, width, height: workArea.height };
}

/** A full-width part of the work area. Rectangle `HalfSplitFrameCalculation.verticalRect`. */
export function verticalRect(workArea: Rect, side: Side, fraction: number): Rect {
  const height = floorDimension(workArea.height * fraction);
  const y = side === 'start' ? workArea.y : workArea.y + workArea.height - height;
  return { x: workArea.x, y, width: workArea.width, height };
}

/** A corner of the work area. Rectangle `HalfSplitFrameCalculation.cornerRect`. */
export function cornerRect(
  workArea: Rect,
  horizontalSide: Side,
  verticalSide: Side,
  horizontalFraction: number,
  verticalFraction: number,
): Rect {
  const { x, width } = horizontalRect(workArea, horizontalSide, horizontalFraction);
  const { y, height } = verticalRect(workArea, verticalSide, verticalFraction);
  return { x, y, width, height };
}

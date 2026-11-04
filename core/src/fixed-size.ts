import type { Rect } from './geometry.js';

/**
 * Places a window that cannot change size into the frame that the
 * calculation wanted (`zone`), as Rectangle `FixedSizeWindowMover` does with
 * its default `edgesAndCorners` alignment. On each axis the window keeps to
 * the work-area edge that the zone touches. When the zone touches no edge or
 * both edges of an axis, the window is centered in the zone on that axis.
 * Then the window is moved into the work area. Its size does not change.
 */
export function fixedSizeFrame(width: number, height: number, zone: Rect, workArea: Rect): Rect {
  const x = alignedStart(zone.x, zone.width, width, workArea.x, workArea.width);
  const y = alignedStart(zone.y, zone.height, height, workArea.y, workArea.height);
  return moveInside({ x, y, width, height }, workArea);
}

/** Moves `rect` into `bounds` without a change of size. A side that is too large starts at the bounds. */
export function moveInside(rect: Rect, bounds: Rect): Rect {
  const x = Math.max(bounds.x, Math.min(rect.x, bounds.x + bounds.width - rect.width));
  const y = Math.max(bounds.y, Math.min(rect.y, bounds.y + bounds.height - rect.height));
  return { ...rect, x, y };
}

const alignmentTolerance = 1;

function alignedStart(zoneStart: number, zoneLength: number, length: number, boundsStart: number, boundsLength: number): number {
  if (Math.abs(length - zoneLength) <= alignmentTolerance) {
    return zoneStart;
  }
  const touchesStart = zoneStart === boundsStart;
  const touchesEnd = zoneStart + zoneLength === boundsStart + boundsLength;
  if (touchesStart && !touchesEnd) {
    return zoneStart;
  }
  if (touchesEnd && !touchesStart) {
    return zoneStart + zoneLength - length;
  }
  return zoneStart + Math.round((zoneLength - length) / 2);
}

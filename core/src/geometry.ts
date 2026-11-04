/** A rectangle in integer pixels. The y axis points down, as in Mutter. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A monitor. `index` is the platform monitor index and is equal to the
 * position of the monitor in the `monitors` array given to `execute`.
 * `workArea` is the geometry without panels and docks.
 */
export interface Monitor {
  index: number;
  geometry: Rect;
  workArea: Rect;
}

export function rectEquals(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Moves `rect` into `bounds`. A side that is larger than `bounds` shrinks to fit. */
export function clampRect(rect: Rect, bounds: Rect): Rect {
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  const x = Math.min(Math.max(rect.x, bounds.x), bounds.x + bounds.width - width);
  const y = Math.min(Math.max(rect.y, bounds.y), bounds.y + bounds.height - height);
  return { x, y, width, height };
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
}

/** The monitor whose geometry contains the center of `rect`, if any. */
export function monitorForRect(rect: Rect, monitors: readonly Monitor[]): Monitor | undefined {
  const center = rectCenter(rect);
  return monitors.find((monitor) => containsPoint(monitor.geometry, center));
}

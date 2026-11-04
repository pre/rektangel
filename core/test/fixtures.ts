import { defaultConfig, type ExecuteInput, type Monitor, type Rect } from '../src/index.js';

/** The development monitor: 3008x1692 logical pixels with the 27 px GNOME top bar. */
export const singleMonitor: Monitor = {
  index: 0,
  geometry: { x: 0, y: 0, width: 3008, height: 1692 },
  workArea: { x: 0, y: 27, width: 3008, height: 1665 },
};

/** A 1920x1080 monitor to the right of `singleMonitor`, with no panel. */
export const rightMonitor: Monitor = {
  index: 1,
  geometry: { x: 3008, y: 0, width: 1920, height: 1080 },
  workArea: { x: 3008, y: 0, width: 1920, height: 1080 },
};

/** A 1080x1920 portrait monitor with the 27 px top bar. */
export const portraitMonitor: Monitor = {
  index: 0,
  geometry: { x: 0, y: 0, width: 1080, height: 1920 },
  workArea: { x: 0, y: 27, width: 1080, height: 1893 },
};

export const twoMonitors: readonly Monitor[] = [singleMonitor, rightMonitor];

export function input(overrides: Partial<ExecuteInput>): ExecuteInput {
  return {
    action: 'maximize',
    frame: { x: 100, y: 200, width: 800, height: 600 },
    monitorIndex: 0,
    monitors: [singleMonitor],
    canResize: true,
    history: undefined,
    config: defaultConfig,
    ...overrides,
  };
}

export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

/** True when `inner` lies completely inside `outer`. */
export function isInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

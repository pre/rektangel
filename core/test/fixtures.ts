import { defaultConfig, type ExecuteInput, type Monitor } from '../src/index.js';

/** One 3008x1692 monitor with a 32 px top panel, as on the development machine. */
export const singleMonitor: Monitor = {
  index: 0,
  geometry: { x: 0, y: 0, width: 3008, height: 1692 },
  workArea: { x: 0, y: 32, width: 3008, height: 1660 },
};

export function input(overrides: Partial<ExecuteInput>): ExecuteInput {
  return {
    action: 'maximize',
    windowId: '1',
    frame: { x: 100, y: 200, width: 800, height: 600 },
    monitorIndex: 0,
    monitors: [singleMonitor],
    canResize: true,
    history: undefined,
    config: defaultConfig,
    ...overrides,
  };
}

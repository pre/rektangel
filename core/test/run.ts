import { execute, type Action, type ExecuteInput, type Rect, type WindowHistory } from '../src/index.js';
import { input } from './fixtures.js';

/**
 * Presses the actions one after the other, as the extension does: each
 * press gets the frame and the history that the press before it gave.
 * Returns the frame after each press.
 */
export function press(actions: readonly Action[], overrides: Partial<ExecuteInput> = {}): Rect[] {
  let frame = overrides.frame ?? input({}).frame;
  let monitorIndex = overrides.monitorIndex ?? 0;
  let history: WindowHistory | undefined = overrides.history;
  const frames: Rect[] = [];
  for (const action of actions) {
    const result = execute(input({ ...overrides, action, frame, monitorIndex, history }));
    if (result.change !== null) {
      frame = result.change.frame;
      monitorIndex = result.change.monitorIndex;
    }
    history = result.history;
    frames.push(frame);
  }
  return frames;
}

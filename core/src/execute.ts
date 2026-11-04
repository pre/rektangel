import { Action } from './actions.js';
import { calculations } from './calculations/index.js';
import type { CoreConfig } from './config.js';
import { monitorForRect, rectEquals, type Monitor, type Rect } from './geometry.js';
import type { WindowHistory } from './history.js';

export interface ExecuteInput {
  action: Action;
  windowId: string;
  /** The current frame of the window. */
  frame: Rect;
  /** Index into `monitors` of the monitor that the window is on now. */
  monitorIndex: number;
  /** All monitors. `monitors[i].index` is `i`. */
  monitors: readonly Monitor[];
  /** False for windows that can move but cannot change size. */
  canResize: boolean;
  /** The stored history of this window, or undefined for a new window. */
  history: WindowHistory | undefined;
  config: Readonly<CoreConfig>;
}

export interface WindowChange {
  frame: Rect;
  monitorIndex: number;
}

export interface ExecuteResult {
  /** The frame to apply, or null when the window must not change. */
  change: WindowChange | null;
  /** The history to store for this window. Undefined means: delete the entry. */
  history: WindowHistory | undefined;
}

/**
 * Calculates the new frame of a window for an action. Pure: it does not
 * change its input. The caller applies `change` and stores `history`.
 */
export function execute(input: ExecuteInput): ExecuteResult {
  if (input.action === Action.Restore) {
    return restore(input);
  }

  const calculation = calculations[input.action];
  const monitor = input.monitors[input.monitorIndex];
  if (calculation === undefined || monitor === undefined) {
    return { change: null, history: input.history };
  }

  // As in Rectangle: a frame that differs from the last result means the
  // user moved the window. Then the repeat count starts again and the
  // current frame becomes the restore frame.
  const previous = input.history?.lastAction;
  const movedByHand = previous === undefined || !rectEquals(previous.rect, input.frame);
  const lastAction = movedByHand ? undefined : previous;
  const restoreRect = movedByHand || input.history === undefined ? input.frame : input.history.restoreRect;

  const result = calculation({
    frame: input.frame,
    monitor,
    monitors: input.monitors,
    lastAction,
    config: input.config,
  });
  if (result === null) {
    return { change: null, history: { restoreRect, lastAction } };
  }

  // TODO(core): when canResize is false, keep the size and only move the
  // window, as Rectangle FixedSizeWindowMover does.

  const count = lastAction?.action === input.action ? lastAction.count + 1 : 1;
  const history: WindowHistory = {
    restoreRect,
    lastAction: { action: input.action, rect: result.frame, count },
  };
  const unchanged = result.monitorIndex === input.monitorIndex && rectEquals(result.frame, input.frame);
  return { change: unchanged ? null : result, history };
}

function restore(input: ExecuteInput): ExecuteResult {
  if (input.history === undefined) {
    return { change: null, history: undefined };
  }
  const { restoreRect } = input.history;
  const monitorIndex = monitorForRect(restoreRect, input.monitors)?.index ?? input.monitorIndex;
  const change = rectEquals(restoreRect, input.frame) ? null : { frame: { ...restoreRect }, monitorIndex };
  return { change, history: { restoreRect } };
}

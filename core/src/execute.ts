import { Action } from './actions.js';
import { calculations } from './calculations/index.js';
import type { CoreConfig } from './config.js';
import { fixedSizeFrame } from './fixed-size.js';
import { clampRect, monitorForRect, rectEquals, type Monitor, type Rect } from './geometry.js';
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
    action: input.action,
    frame: input.frame,
    monitor,
    monitors: input.monitors,
    lastAction,
    config: input.config,
  });
  const target = result === null ? undefined : input.monitors[result.monitorIndex];
  if (result === null || target === undefined) {
    return { change: null, history: { restoreRect, lastAction } };
  }

  const frame = placeOnMonitor(roundRect(result.frame), input.frame, input.canResize, target.workArea);
  const recordedAction = result.resultingAction ?? input.action;
  const count = lastAction?.action === recordedAction ? lastAction.count + 1 : 1;
  const history: WindowHistory = {
    restoreRect,
    lastAction: {
      action: recordedAction,
      rect: frame,
      count,
      ...(result.subAction === undefined ? {} : { subAction: result.subAction }),
    },
  };
  const unchanged = result.monitorIndex === input.monitorIndex && rectEquals(frame, input.frame);
  return { change: unchanged ? null : { frame, monitorIndex: result.monitorIndex }, history };
}

/**
 * Keeps the frame inside the work area, as Rectangle `BestEffortWindowMover`
 * does. A window that cannot change size keeps its size and goes where the
 * calculated frame is (Rectangle `FixedSizeWindowMover`).
 */
function placeOnMonitor(calculated: Rect, current: Rect, canResize: boolean, workArea: Rect): Rect {
  const sizeChanges = calculated.width !== current.width || calculated.height !== current.height;
  if (!canResize && sizeChanges) {
    return fixedSizeFrame(current.width, current.height, calculated, workArea);
  }
  return clampRect(calculated, workArea);
}

/** Rectangle works in fractional points. Mutter needs integer pixels, so every edge rounds to the nearest pixel. */
function roundRect(rect: Rect): Rect {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  return {
    x,
    y,
    width: Math.round(rect.x + rect.width) - x,
    height: Math.round(rect.y + rect.height) - y,
  };
}

function restore(input: ExecuteInput): ExecuteResult {
  if (input.history === undefined) {
    return { change: null, history: undefined };
  }
  const { restoreRect } = input.history;
  const target = restoreFrame(restoreRect, input);
  const change = rectEquals(target.frame, input.frame) ? null : target;
  return { change, history: { restoreRect } };
}

/**
 * The restore frame on the monitor that contains its center. When that
 * monitor is gone, the frame moves into the work area of the current monitor.
 */
function restoreFrame(restoreRect: Rect, input: ExecuteInput): WindowChange {
  const monitor = monitorForRect(restoreRect, input.monitors);
  if (monitor !== undefined) {
    return { frame: { ...restoreRect }, monitorIndex: monitor.index };
  }
  const current = input.monitors[input.monitorIndex];
  const frame = current === undefined ? { ...restoreRect } : clampRect(restoreRect, current.workArea);
  return { frame, monitorIndex: input.monitorIndex };
}

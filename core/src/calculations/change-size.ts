import type { Rect } from '../geometry.js';
import type { Calculation } from './types.js';

// Rectangle ChangeSizeCalculation with its defaults: no gaps,
// curtainChangeSize on, smallerShrinksMaximizedHeight off.

/** An edge closer than this to the work-area edge counts as touching it. */
const screenEdgeGap = 5;

/** Rectangle `minimumWindowWidth` and `minimumWindowHeight`. */
export const defaultMinimumFraction = 0.25;

type Axis = { start: number; length: number };

/**
 * Grows or shrinks one axis by `offset`, half on each side. An edge that
 * touches the work area stays there ("curtain" resize).
 */
function resizeAxis(window: Axis, area: Axis, offset: number): Axis {
  let length = window.length + offset;
  let start = window.start - Math.floor(offset / 2);
  const againstStart = Math.abs(window.start - area.start) <= screenEdgeGap;
  const againstEnd = Math.abs(window.start + window.length - (area.start + area.length)) <= screenEdgeGap;
  if (againstEnd) {
    start = area.start + area.length - length;
    if (againstStart) {
      length = area.length;
    }
  }
  if (againstStart) {
    start = area.start;
  }
  if (length >= area.length) {
    // Rectangle keeps the far edge here; `execute` then moves the frame into the work area.
    length = area.length;
    start = window.start + window.length - length;
  }
  return { start, length };
}

function shrinkAroundCenter(window: Axis, _area: Axis, offset: number): Axis {
  return { start: window.start - Math.floor(offset / 2), length: window.length + offset };
}

const horizontal = (r: Rect): Axis => ({ start: r.x, length: r.width });
const vertical = (r: Rect): Axis => ({ start: r.y, length: r.height });

function againstAllEdges(frame: Rect, area: Rect): boolean {
  return (
    Math.abs(frame.x - area.x) <= screenEdgeGap &&
    Math.abs(frame.y - area.y) <= screenEdgeGap &&
    Math.abs(frame.x + frame.width - (area.x + area.width)) <= screenEdgeGap &&
    Math.abs(frame.y + frame.height - (area.y + area.height)) <= screenEdgeGap
  );
}

export function changeSize(
  frame: Rect,
  area: Rect,
  direction: 'larger' | 'smaller',
  stepSize: number,
  minimumFraction = defaultMinimumFraction,
): Rect {
  const offset = direction === 'larger' ? stepSize : -stepSize;
  // A maximized window has all its edges pinned, so the curtain rule would
  // not shrink it. Then it shrinks around its center.
  const resize = offset < 0 && againstAllEdges(frame, area) ? shrinkAroundCenter : resizeAxis;
  const h = resize(horizontal(frame), horizontal(area), offset);
  const v = resize(vertical(frame), vertical(area), offset);
  const resized = { x: h.start, y: v.start, width: h.length, height: v.length };

  const minimumWidth = Math.max(1, Math.floor(area.width * minimumFraction));
  const minimumHeight = Math.max(1, Math.floor(area.height * minimumFraction));
  const tooSmall = resized.width < minimumWidth || resized.height < minimumHeight;
  return direction === 'smaller' && tooSmall ? { ...frame } : resized;
}

export const larger: Calculation = ({ frame, monitor, config }) => ({
  frame: changeSize(frame, monitor.workArea, 'larger', config.stepSize),
  monitorIndex: monitor.index,
});

export const smaller: Calculation = ({ frame, monitor, config }) => ({
  frame: changeSize(frame, monitor.workArea, 'smaller', config.stepSize),
  monitorIndex: monitor.index,
});

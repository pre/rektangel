import type { Rect } from '../geometry.js';
import type { Calculation } from './types.js';

/**
 * The frame of a centered window. Rectangle `CenterCalculation`: the window
 * keeps its size. A side that is larger than the work area gets the size of
 * the work area. When both sides are larger, the result is maximize.
 */
export function centeredRect(frame: Rect, area: Rect): { frame: Rect; maximized: boolean } {
  const heightExceeded = frame.height > area.height;
  const widthExceeded = frame.width > area.width;
  if (heightExceeded && widthExceeded) {
    return { frame: { ...area }, maximized: true };
  }
  const centered = {
    x: widthExceeded ? area.x : area.x + Math.round((area.width - frame.width) / 2),
    y: heightExceeded ? area.y : area.y + Math.round((area.height - frame.height) / 2),
    width: widthExceeded ? area.width : frame.width,
    height: heightExceeded ? area.height : frame.height,
  };
  return { frame: centered, maximized: false };
}

export const center: Calculation = ({ frame, monitor }) => {
  const { frame: centered, maximized } = centeredRect(frame, monitor.workArea);
  return {
    frame: centered,
    monitorIndex: monitor.index,
    ...(maximized ? { resultingAction: 'maximize' as const } : {}),
  };
};

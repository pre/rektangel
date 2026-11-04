import type { Calculation } from './types.js';

/** Rectangle `MaximizeCalculation`: the frame becomes the work area. */
export const maximize: Calculation = ({ monitor }) => ({
  frame: { ...monitor.workArea },
  monitorIndex: monitor.index,
});

/** Rectangle `AlmostMaximizeCalculation`: a part of the work area, centered. */
export const almostMaximize: Calculation = ({ monitor, config }) => {
  const area = monitor.workArea;
  const width = Math.round(area.width * config.almostMaximizeRatio);
  const height = Math.round(area.height * config.almostMaximizeRatio);
  return {
    frame: {
      x: area.x + Math.round((area.width - width) / 2),
      y: area.y + Math.round((area.height - height) / 2),
      width,
      height,
    },
    monitorIndex: monitor.index,
  };
};

/** Rectangle `MaximizeHeightCalculation`: full work-area height, same x and width. */
export const maximizeHeight: Calculation = ({ frame, monitor }) => ({
  frame: { ...frame, y: monitor.workArea.y, height: monitor.workArea.height },
  monitorIndex: monitor.index,
});

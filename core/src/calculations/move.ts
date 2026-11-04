import type { Calculation } from './types.js';

// Rectangle MoveLeftRightCalculation and MoveUpDownCalculation with the
// defaults: the window keeps its size (resizeOnDirectionalMove off) and is
// centered on the other axis (centeredDirectionalMove on).

function horizontalMove(toEnd: boolean): Calculation {
  return ({ frame, monitor }) => {
    const area = monitor.workArea;
    const tooTall = frame.height >= area.height;
    const height = tooTall ? area.height : frame.height;
    return {
      frame: {
        x: toEnd ? area.x + area.width - frame.width : area.x,
        y: tooTall ? area.y : area.y + Math.round((area.height - frame.height) / 2),
        width: frame.width,
        height,
      },
      monitorIndex: monitor.index,
    };
  };
}

function verticalMove(toEnd: boolean): Calculation {
  return ({ frame, monitor }) => {
    const area = monitor.workArea;
    const tooWide = frame.width >= area.width;
    const width = tooWide ? area.width : frame.width;
    return {
      frame: {
        x: tooWide ? area.x : area.x + Math.round((area.width - frame.width) / 2),
        y: toEnd ? area.y + area.height - frame.height : area.y,
        width,
        height: frame.height,
      },
      monitorIndex: monitor.index,
    };
  };
}

export const moveLeft = horizontalMove(false);
export const moveRight = horizontalMove(true);
export const moveUp = verticalMove(false);
export const moveDown = verticalMove(true);

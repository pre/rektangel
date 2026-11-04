import type { Rect } from '../geometry.js';
import type { LastAction, SubAction } from '../history.js';
import type { Calculation, CalculationInput, CalculationResult } from './types.js';

// Rectangle FirstThirdCalculation, CenterThirdCalculation,
// LastThirdCalculation, FirstTwoThirdsCalculation and
// LastTwoThirdsCalculation. They are OrientationAware: on a portrait work
// area the thirds stack from top to bottom. A repeated press moves to the
// next position, which the recorded sub action tells.

interface Placement {
  frame: Rect;
  subAction: SubAction;
}

const isLandscape = (area: Rect): boolean => area.width > area.height;

function firstThirdRect(area: Rect): Placement {
  return isLandscape(area)
    ? { frame: { ...area, width: Math.floor(area.width / 3) }, subAction: 'left-third' }
    : { frame: { ...area, height: Math.floor(area.height / 3) }, subAction: 'top-third' };
}

function centerThirdRect(area: Rect): Placement {
  return isLandscape(area)
    ? {
        frame: { ...area, x: area.x + Math.floor(area.width / 3), width: area.width / 3 },
        subAction: 'center-vertical-third',
      }
    : {
        frame: { ...area, y: area.y + Math.floor(area.height / 3), height: area.height / 3 },
        subAction: 'center-horizontal-third',
      };
}

function lastThirdRect(area: Rect): Placement {
  const width = Math.floor(area.width / 3);
  const height = Math.floor(area.height / 3);
  return isLandscape(area)
    ? { frame: { ...area, x: area.x + area.width - width, width }, subAction: 'right-third' }
    : { frame: { ...area, y: area.y + area.height - height, height }, subAction: 'bottom-third' };
}

function firstTwoThirdsRect(area: Rect): Placement {
  return isLandscape(area)
    ? { frame: { ...area, width: Math.floor((area.width * 2) / 3) }, subAction: 'left-two-thirds' }
    : { frame: { ...area, height: Math.floor((area.height * 2) / 3) }, subAction: 'top-two-thirds' };
}

function lastTwoThirdsRect(area: Rect): Placement {
  const width = Math.floor((area.width * 2) / 3);
  const height = Math.floor((area.height * 2) / 3);
  return isLandscape(area)
    ? { frame: { ...area, x: area.x + area.width - width, width }, subAction: 'right-two-thirds' }
    : { frame: { ...area, y: area.y + area.height - height, height }, subAction: 'bottom-two-thirds' };
}

const startThirds: readonly SubAction[] = ['left-third', 'top-third'];
const centerThirds: readonly SubAction[] = ['center-vertical-third', 'center-horizontal-third'];
const endThirds: readonly SubAction[] = ['right-third', 'bottom-third'];

function result(input: CalculationInput, placement: Placement): CalculationResult {
  return { ...placement, monitorIndex: input.monitor.index };
}

function firstThirdPlacement(area: Rect, lastAction: LastAction | undefined): Placement {
  const sub = lastAction?.subAction;
  if (lastAction?.action === 'first-third' && sub !== undefined) {
    if (startThirds.includes(sub)) return centerThirdRect(area);
    if (centerThirds.includes(sub)) return lastThirdRect(area);
  }
  if (lastAction?.action === 'last-third' && sub !== undefined && startThirds.includes(sub)) {
    return centerThirdRect(area);
  }
  return firstThirdRect(area);
}

function lastThirdPlacement(area: Rect, lastAction: LastAction | undefined): Placement {
  const sub = lastAction?.subAction;
  if (lastAction?.action === 'last-third' && sub !== undefined) {
    if (endThirds.includes(sub)) return centerThirdRect(area);
    if (centerThirds.includes(sub)) return firstThirdRect(area);
  }
  if (lastAction?.action === 'first-third' && sub !== undefined && endThirds.includes(sub)) {
    return centerThirdRect(area);
  }
  return lastThirdRect(area);
}

export const firstThird: Calculation = (input) => result(input, firstThirdPlacement(input.monitor.workArea, input.lastAction));

export const centerThird: Calculation = (input) => result(input, centerThirdRect(input.monitor.workArea));

export const lastThird: Calculation = (input) => result(input, lastThirdPlacement(input.monitor.workArea, input.lastAction));

export const firstTwoThirds: Calculation = (input) => {
  const sub = input.lastAction?.subAction;
  const area = input.monitor.workArea;
  const onFirst = sub === 'left-two-thirds' || sub === 'top-two-thirds';
  return result(input, onFirst ? lastTwoThirdsRect(area) : firstTwoThirdsRect(area));
};

export const lastTwoThirds: Calculation = (input) => {
  const sub = input.lastAction?.subAction;
  const area = input.monitor.workArea;
  const onLast = sub === 'right-two-thirds' || sub === 'bottom-two-thirds';
  return result(input, onLast ? firstTwoThirdsRect(area) : lastTwoThirdsRect(area));
};

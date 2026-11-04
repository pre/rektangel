export { Action, allActions, isAction } from './actions.js';
export { defaultConfig, type CoreConfig, type CornerAxis } from './config.js';
export {
  clampRect,
  containsPoint,
  monitorForRect,
  rectCenter,
  rectEquals,
  rectsIntersect,
  type Monitor,
  type Point,
  type Rect,
} from './geometry.js';
export type { LastAction, WindowHistory } from './history.js';
export { execute, type ExecuteInput, type ExecuteResult, type WindowChange } from './execute.js';

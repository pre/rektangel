import type { Calculation } from './types.js';

export const maximize: Calculation = ({ monitor }) => ({
  frame: { ...monitor.workArea },
  monitorIndex: monitor.index,
});

export type CornerAxis = 'horizontal' | 'vertical';

export interface CoreConfig {
  /** Fractions of the work area that halves and corners cycle through. */
  cycleSizes: readonly number[];
  /** Pixels that larger and smaller add or remove on each side. */
  stepSize: number;
  /** The axis along which a repeated corner action expands. */
  cornerAxis: CornerAxis;
  /** Fraction of the work area for almost maximize. */
  almostMaximizeRatio: number;
}

export const defaultConfig: Readonly<CoreConfig> = Object.freeze({
  cycleSizes: Object.freeze([1 / 2, 2 / 3, 1 / 3]),
  stepSize: 30,
  cornerAxis: 'horizontal',
  almostMaximizeRatio: 0.9,
});

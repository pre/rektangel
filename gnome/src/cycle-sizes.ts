import { sortedCycleSizes } from '@rektangel/core';

export const cycleSizesSetting = 'cycle-sizes';

/** The size of the first press. It is always in the cycle, so the setting does not have it. */
export const alwaysInCycle = '1/2';

/** The sizes in the preferences window, smallest first. */
export const cycleSizeChoices = [
  { label: '1/4', fraction: 1 / 4 },
  { label: '1/3', fraction: 1 / 3 },
  { label: alwaysInCycle, fraction: 1 / 2 },
  { label: '2/3', fraction: 2 / 3 },
  { label: '3/4', fraction: 3 / 4 },
] as const;

/** The core cycle sizes for the cycle-sizes setting: one half and the selected sizes. */
export function cycleSizesFromSetting(selected: readonly string[]): number[] {
  return cycleSizeChoices
    .filter(({ label }) => label === alwaysInCycle || selected.includes(label))
    .map(({ fraction }) => fraction);
}

/** The sizes of one cycle in the order of the presses, for example "1/2 → 2/3 → 1/3 → 1/2". */
export function cycleOrderLabel(selected: readonly string[]): string {
  const labels = sortedCycleSizes(cycleSizesFromSetting(selected)).map(
    (fraction) => cycleSizeChoices.find((choice) => choice.fraction === fraction)!.label,
  );
  return labels.length === 1 ? `Always ${alwaysInCycle}` : [...labels, labels[0]].join(' → ');
}

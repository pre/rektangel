/** What the Caps Lock key does besides Hyper. See ADR 0015. */
export type CapsLockBehavior = 'both-shifts' | 'hyper-only' | 'shift-caps';

/** The XKB option of each Caps Lock behavior. All of them put Caps Lock on Mod3. */
export const capsLockOptions: Readonly<Record<CapsLockBehavior, string>> = {
  'both-shifts': 'rektangel:caps_hyper_both_shifts',
  'hyper-only': 'rektangel:caps_hyper_only',
  'shift-caps': 'rektangel:caps_hyper',
};

function isRektangelOption(option: string): boolean {
  return option.startsWith('rektangel:');
}

export function hasRektangelOption(options: readonly string[]): boolean {
  return options.some(isRektangelOption);
}

/**
 * The lines that a user file must have for the Rektangel option: the
 * lines of the shipped file without comments, blank lines and includes.
 * A user file that exists already includes the system rules itself.
 */
function blockLines(shipped: string): string[] {
  return shipped.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('! include');
  });
}

function findBlock(lines: readonly string[], block: readonly string[]): number {
  for (let start = lines.length - block.length; start >= 0; start--) {
    if (block.every((line, offset) => lines[start + offset] === line)) {
      return start;
    }
  }
  return -1;
}

/**
 * The new text of a user XKB file. With no user file, the shipped file.
 * Otherwise the user file with the Rektangel lines added at the end, if
 * they are not there yet. The Rektangel lines of an older version go first.
 */
export function addXkbLines(existing: string | null, shipped: string): string {
  if (existing === null) {
    return shipped;
  }
  const block = blockLines(shipped);
  if (findBlock(existing.split('\n'), block) >= 0) {
    return existing;
  }
  const base = existing.split('\n').some(isRektangelLine) ? removeXkbLines(existing) : existing;
  if (base === null) {
    return shipped;
  }
  const separator = base === '' || base.endsWith('\n') ? '' : '\n';
  return `${base}${separator}\n${block.join('\n')}\n`;
}

/** A Rektangel line has the word rektangel. The shipped comments have it too. */
function isRektangelLine(line: string): boolean {
  return /rektangel/i.test(line);
}

function isRule(line: string): boolean {
  const trimmed = line.trim();
  return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('!');
}

/** True for a section header, such as "! option = symbols", with no rules below it. */
function isEmptySection(lines: readonly string[], index: number): boolean {
  if (!/^\s*!/.test(lines[index] ?? '') || /^\s*! include/.test(lines[index] ?? '')) {
    return false;
  }
  const next = lines.slice(index + 1).findIndex((line) => line.trim().startsWith('!'));
  const body = next < 0 ? lines.slice(index + 1) : lines.slice(index + 1, index + 1 + next);
  return !body.some((line) => isRule(line) && !isRektangelLine(line));
}

/**
 * The text of a user XKB file without the Rektangel lines, or null when
 * the file must be removed because it has no other rules. The Rektangel
 * lines are found by their name, not by the text of the shipped file,
 * so that the lines of an older version are also removed.
 */
export function removeXkbLines(existing: string): string | null {
  const lines = existing.split('\n');
  const kept: string[] = [];
  lines.forEach((line, index) => {
    if (isRektangelLine(line) || isEmptySection(lines, index)) {
      // Also remove the blank line that addXkbLines put before the block.
      if (kept.at(-1) === '') {
        kept.pop();
      }
    } else {
      kept.push(line);
    }
  });
  return kept.some(isRule) ? kept.join('\n') : null;
}

/** The first xkb-option that also changes the Caps Lock key, or null. */
export function conflictingCapsOption(options: readonly string[]): string | null {
  return options.find((option) => option.startsWith('caps:')) ?? null;
}

export interface CapsLockModeState {
  readonly xkbOptions: readonly string[];
  /** 'wayland' or 'x11', as in XDG_SESSION_TYPE. */
  readonly sessionType: string | null;
}

/**
 * Why Caps Lock mode cannot work, in a short English text, or null when
 * it can. The extension then registers the shortcuts with the Windows key.
 */
export function capsLockModeProblem({ xkbOptions, sessionType }: CapsLockModeState): string | null {
  if (sessionType === 'x11') {
    return 'the X server does not read user XKB rules';
  }
  const conflict = conflictingCapsOption(xkbOptions);
  if (conflict !== null) {
    return `xkb-options has ${conflict}, which also changes Caps Lock`;
  }
  return hasRektangelOption(xkbOptions) ? null : 'xkb-options does not have a Rektangel option';
}

/** The options with the option of the behavior as the only Rektangel option. */
export function withXkbOption(options: readonly string[], behavior: CapsLockBehavior): string[] {
  const option = capsLockOptions[behavior];
  const others = withoutXkbOption(options);
  return options.includes(option) && others.length === options.length - 1 ? [...options] : [...others, option];
}

export function withoutXkbOption(options: readonly string[]): string[] {
  return options.filter((option) => !isRektangelOption(option));
}

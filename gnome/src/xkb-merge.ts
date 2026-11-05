export const xkbOption = 'rektangel:caps_hyper';

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
 * they are not there yet.
 */
export function addXkbLines(existing: string | null, shipped: string): string {
  if (existing === null) {
    return shipped;
  }
  const block = blockLines(shipped);
  if (findBlock(existing.split('\n'), block) >= 0) {
    return existing;
  }
  const separator = existing === '' || existing.endsWith('\n') ? '' : '\n';
  return `${existing}${separator}\n${block.join('\n')}\n`;
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

export function withXkbOption(options: readonly string[]): string[] {
  return options.includes(xkbOption) ? [...options] : [...options, xkbOption];
}

export function withoutXkbOption(options: readonly string[]): string[] {
  return options.filter((option) => option !== xkbOption);
}

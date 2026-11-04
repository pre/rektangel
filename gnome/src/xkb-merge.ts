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

/**
 * The text of a user XKB file without the Rektangel lines, or null when
 * the file must be removed because it is the shipped file.
 */
export function removeXkbLines(existing: string, shipped: string): string | null {
  if (existing === shipped) {
    return null;
  }
  const lines = existing.split('\n');
  const block = blockLines(shipped);
  let start = findBlock(lines, block);
  if (start < 0) {
    return existing;
  }
  let count = block.length;
  // Also remove the blank line that addXkbLines put before the block.
  if (start > 0 && lines[start - 1] === '') {
    start--;
    count++;
  }
  lines.splice(start, count);
  return lines.join('\n');
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

/**
 * A parser for the small TOML subset that config.toml uses: `key = value`
 * lines, numbers, quoted strings, one-line arrays of numbers, comments and
 * at most one `[section]`. Pure, so that it runs in Node.js tests and in GJS.
 */

export type TomlValue = number | string | readonly number[];

/** Keys outside a section are in the table with the name "". */
export type TomlDocument = Record<string, Record<string, TomlValue>>;

export class TomlError extends Error {
  constructor(lineNumber: number, message: string) {
    super(`line ${lineNumber}: ${message}`);
    this.name = 'TomlError';
  }
}

const sectionPattern = /^\[\s*([A-Za-z0-9_-]+)\s*\]$/;
const keyValuePattern = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/;
const numberPattern = /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export function parseToml(text: string): TomlDocument {
  const document: TomlDocument = { '': {} };
  let table = '';
  let sectionCount = 0;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = stripComment(rawLine, lineNumber).trim();
    if (line === '') {
      return;
    }

    const section = sectionPattern.exec(line);
    if (section) {
      sectionCount += 1;
      if (sectionCount > 1) {
        throw new TomlError(lineNumber, 'only one [section] is supported');
      }
      table = section[1]!;
      document[table] = {};
      return;
    }

    const keyValue = keyValuePattern.exec(line);
    if (!keyValue) {
      throw new TomlError(lineNumber, `expected "key = value", got "${line}"`);
    }
    const key = keyValue[1]!;
    const values = document[table]!;
    if (Object.hasOwn(values, key)) {
      throw new TomlError(lineNumber, `duplicate key "${key}"`);
    }
    values[key] = parseValue(keyValue[2]!.trim(), lineNumber);
  });

  return document;
}

/** Removes a `#` comment. A `#` inside a quoted string is not a comment. */
function stripComment(line: string, lineNumber: number): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote === null) {
      if (char === '#') {
        return line.slice(0, i);
      }
      if (char === '"' || char === "'") {
        quote = char;
      }
    } else if (char === '\\' && quote === '"') {
      i++;
    } else if (char === quote) {
      quote = null;
    }
  }
  if (quote !== null) {
    throw new TomlError(lineNumber, 'string has no closing quote');
  }
  return line;
}

function parseValue(text: string, lineNumber: number): TomlValue {
  if (text.startsWith('"')) {
    return parseBasicString(text, lineNumber);
  }
  if (text.startsWith("'")) {
    return parseLiteralString(text, lineNumber);
  }
  if (text.startsWith('[')) {
    return parseNumberArray(text, lineNumber);
  }
  return parseNumber(text, lineNumber);
}

function parseNumber(text: string, lineNumber: number): number {
  if (!numberPattern.test(text)) {
    throw new TomlError(lineNumber, `"${text}" is not a number`);
  }
  return Number(text);
}

function parseNumberArray(text: string, lineNumber: number): number[] {
  if (!text.endsWith(']')) {
    throw new TomlError(lineNumber, 'array must close with "]" on the same line');
  }
  const items = text
    .slice(1, -1)
    .split(',')
    .map((item) => item.trim());
  // TOML allows a comma after the last item.
  if (items.at(-1) === '') {
    items.pop();
  }
  return items.map((item) => parseNumber(item, lineNumber));
}

const escapes: Record<string, string> = { '"': '"', '\\': '\\', n: '\n', t: '\t' };

function parseBasicString(text: string, lineNumber: number): string {
  let result = '';
  for (let i = 1; i < text.length; i++) {
    const char = text[i]!;
    if (char === '"') {
      expectEnd(text, i, lineNumber);
      return result;
    }
    if (char === '\\') {
      const escaped = escapes[text[i + 1] ?? ''];
      if (escaped === undefined) {
        throw new TomlError(lineNumber, `unsupported escape "\\${text[i + 1] ?? ''}"`);
      }
      result += escaped;
      i++;
    } else {
      result += char;
    }
  }
  throw new TomlError(lineNumber, 'string has no closing quote');
}

function parseLiteralString(text: string, lineNumber: number): string {
  const end = text.indexOf("'", 1);
  if (end === -1) {
    throw new TomlError(lineNumber, 'string has no closing quote');
  }
  expectEnd(text, end, lineNumber);
  return text.slice(1, end);
}

function expectEnd(text: string, closingQuote: number, lineNumber: number): void {
  if (closingQuote !== text.length - 1) {
    throw new TomlError(lineNumber, `unexpected text after the string: "${text.slice(closingQuote + 1)}"`);
  }
}

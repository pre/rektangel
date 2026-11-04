import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseToml, TomlError } from '../src/toml.ts';

describe('parseToml', () => {
  test('returns an empty root table for empty text', () => {
    assert.deepEqual(parseToml(''), { '': {} });
  });

  test('parses integers, floats, exponents and signs', () => {
    const document = parseToml('a = 30\nb = 0.9\nc = -2\nd = 1e2\ne = +1.5E-1');

    assert.deepEqual(document[''], { a: 30, b: 0.9, c: -2, d: 100, e: 0.15 });
  });

  test('parses basic strings with escapes and literal strings without escapes', () => {
    const document = parseToml(`a = "say \\"hi\\"\\n"\nb = 'C:\\path'`);

    assert.deepEqual(document[''], { a: 'say "hi"\n', b: 'C:\\path' });
  });

  test('parses one-line arrays of numbers, with a trailing comma', () => {
    const document = parseToml('a = [0.5, 0.6667, 0.3333]\nb = [ 1, 2, ]\nc = []');

    assert.deepEqual(document[''], { a: [0.5, 0.6667, 0.3333], b: [1, 2], c: [] });
  });

  test('ignores comments and blank lines, but not a # inside a string', () => {
    const document = parseToml('# heading\n\n  a = 1  # trailing\nb = "x # y" # note\n');

    assert.deepEqual(document[''], { a: 1, b: 'x # y' });
  });

  test('puts keys after a [section] into that table', () => {
    const document = parseToml('a = 1\n[gnome]\nb = 2');

    assert.deepEqual(document, { '': { a: 1 }, gnome: { b: 2 } });
  });

  test('accepts Windows line endings', () => {
    assert.deepEqual(parseToml('a = 1\r\nb = 2\r\n')[''], { a: 1, b: 2 });
  });

  test('reads a key that is also an Object.prototype property', () => {
    const document = parseToml('constructor = 1');

    assert.equal(document['']?.['constructor'], 1);
  });

  const errors: [string, string, RegExp][] = [
    ['a second section', '[one]\n[two]', /line 2: only one \[section\]/],
    ['a line without "="', 'a 1', /line 1: expected "key = value"/],
    ['a duplicate key', 'a = 1\na = 2', /line 2: duplicate key "a"/],
    ['a bare word value', 'a = horizontal', /line 1: "horizontal" is not a number/],
    ['a boolean', 'a = true', /is not a number/],
    ['a number with a leading dot', 'a = .5', /is not a number/],
    ['an unclosed basic string', 'a = "abc', /line 1: string has no closing quote/],
    ['an unclosed literal string', "a = 'abc", /string has no closing quote/],
    ['text after a string', 'a = "x" y', /unexpected text after the string/],
    ['an unsupported escape', 'a = "\\u0041"', /unsupported escape/],
    ['an array that does not close', 'a = [1, 2', /must close/],
    ['an array of strings', 'a = ["x"]', /is not a number/],
    ['an empty array item', 'a = [1,,2]', /"" is not a number/],
  ];
  for (const [name, text, message] of errors) {
    test(`throws a TomlError for ${name}`, () => {
      assert.throws(() => parseToml(text), (error: unknown) => error instanceof TomlError && message.test(error.message));
    });
  }
});

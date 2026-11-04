import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allActions, isAction } from '../src/index.js';

test('allActions lists the 26 actions in scope as kebab-case names', () => {
  assert.equal(allActions.length, 26);
  for (const action of allActions) {
    assert.match(action, /^[a-z]+(-[a-z]+)*$/);
  }
});

test('isAction accepts action names and rejects other strings', () => {
  assert.equal(isAction('left-half'), true);
  assert.equal(isAction('left_half'), false);
});

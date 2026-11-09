import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { versionLabel } from '../src/version.ts';

describe('versionLabel', () => {
  test('gives the release version with a v', () => {
    assert.equal(versionLabel('0.2.0'), 'Rektangel v0.2.0');
  });

  test('gives the git hash of a local build as it is', () => {
    assert.equal(versionLabel('git-abcdef1'), 'Rektangel git-abcdef1');
  });

  test('gives only the name when the build has no version', () => {
    assert.equal(versionLabel(undefined), 'Rektangel');
  });
});

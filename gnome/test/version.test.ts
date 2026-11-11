import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { versionLabel, versionMismatchWarning } from '../src/version.ts';

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

describe('versionMismatchWarning', () => {
  test('tells to log out and in when GNOME Shell runs another version', () => {
    assert.equal(
      versionMismatchWarning('git-8a3fd6b', 'git-a605894'),
      'Rektangel was updated to git-8a3fd6b, but GNOME Shell still runs git-a605894. ' +
        'Log out and in to load the new version. Until then, some settings may not work as shown.',
    );
  });

  test('gives release versions with a v', () => {
    assert.match(versionMismatchWarning('0.3.0', '0.2.0') ?? '', /^Rektangel was updated to v0\.3\.0, but GNOME Shell still runs v0\.2\.0\./);
  });

  test('gives null for the same version', () => {
    assert.equal(versionMismatchWarning('git-8a3fd6b', 'git-8a3fd6b'), null);
  });

  test('gives null when a version is not known', () => {
    assert.equal(versionMismatchWarning('git-8a3fd6b', undefined), null);
    assert.equal(versionMismatchWarning(undefined, 'git-8a3fd6b'), null);
  });
});

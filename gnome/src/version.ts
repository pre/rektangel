/** A version-name as people read it: a release with a v, a local build as it is. */
function displayVersion(versionName: string): string {
  return versionName.startsWith('git-') ? versionName : `v${versionName}`;
}

/**
 * The text at the bottom of the preferences window. `versionName` is the
 * `version-name` of metadata.json: the release version, for example `0.2.0`,
 * or `git-<commit>` that esbuild.mjs writes for a local build.
 */
export function versionLabel(versionName: string | undefined): string {
  return versionName === undefined ? 'Rektangel' : `Rektangel ${displayVersion(versionName)}`;
}

/**
 * The warning at the top of the preferences window when GNOME Shell runs
 * another version than the installed one, or null. GNOME Shell loads the
 * extension code only at login, so after an update the old code runs.
 */
export function versionMismatchWarning(installed: string | undefined, running: string | undefined): string | null {
  if (installed === undefined || running === undefined || installed === running) {
    return null;
  }
  return (
    `Rektangel was updated to ${displayVersion(installed)}, but GNOME Shell still runs ${displayVersion(running)}. ` +
    'Log out and in to load the new version. Until then, some settings may not work as shown.'
  );
}

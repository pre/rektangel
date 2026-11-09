/**
 * The text at the bottom of the preferences window. `versionName` is the
 * `version-name` of metadata.json: the release version, for example `0.2.0`,
 * or `git-<commit>` that esbuild.mjs writes for a local build.
 */
export function versionLabel(versionName: string | undefined): string {
  if (versionName === undefined) {
    return 'Rektangel';
  }
  return versionName.startsWith('git-') ? `Rektangel ${versionName}` : `Rektangel v${versionName}`;
}

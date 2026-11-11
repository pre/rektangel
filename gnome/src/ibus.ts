/** An IBus version: major, minor, micro. */
export type IbusVersion = readonly [number, number, number];

/** The version in the output of `ibus version`, for example "IBus 1.5.29-rc2". */
export function parseIbusVersion(output: string): IbusVersion | null {
  const match = /IBus (\d+)\.(\d+)\.(\d+)/.exec(output);
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** IBus 1.5.31 is the first upstream version that ignores a key with Super. */
const fixedVersion: IbusVersion = [1, 5, 31];

function isOlder(version: IbusVersion, than: IbusVersion): boolean {
  for (let index = 0; index < version.length; index++) {
    if (version[index] !== than[index]) {
      return version[index]! < than[index]!;
    }
  }
  return false;
}

/**
 * True when IBus can type the key of a Super shortcut in text fields:
 * IBus is older than 1.5.31, and the package is not a local build with the
 * two upstream fixes. A local build has a version that ends with ~localN,
 * for example 1.5.29-2ubuntu0~local1. `packageVersion` is the version of
 * the libibus package, or null when the system has no dpkg.
 */
export function ibusSwallowsSuperKeys(ibusVersion: IbusVersion | null, packageVersion: string | null): boolean {
  if (ibusVersion === null || !isOlder(ibusVersion, fixedVersion)) {
    return false;
  }
  return packageVersion === null || !/~local\d+$/.test(packageVersion);
}

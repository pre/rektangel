/**
 * In v0.1.0 a stored <Super> was the Rektangel modifier. Now <Hyper> is
 * the Rektangel modifier and <Super> is the Windows key.
 */
export const storageVersionSetting = 'storage-version';

const currentStorageVersion = 1;

/** The part of Gio.Settings that the migration uses. */
export interface MigratableSettings {
  get_user_value(key: string): unknown;
  get_strv(key: string): string[];
  set_strv(key: string, value: string[]): boolean;
  get_int(key: string): number;
  set_int(key: string, value: number): boolean;
}

/** The user-set values that contain <Super>, with <Hyper> in its place. */
export function migratedValues(userValues: ReadonlyMap<string, readonly string[]>): Map<string, string[]> {
  const changed = new Map<string, string[]>();
  for (const [key, accelerators] of userValues) {
    const migrated = accelerators.map((accelerator) => accelerator.replace(/<super>/gi, '<Hyper>'));
    if (migrated.some((accelerator, index) => accelerator !== accelerators[index])) {
      changed.set(key, migrated);
    }
  }
  return changed;
}

/** Rewrites the user-set keybinding keys of v0.1.0 one time. */
export function migrateStoredShortcuts(settings: MigratableSettings, keys: readonly string[]): void {
  if (settings.get_int(storageVersionSetting) !== 0) {
    return;
  }
  const userValues = new Map(
    keys.filter((key) => settings.get_user_value(key) !== null).map((key) => [key, settings.get_strv(key)]),
  );
  for (const [key, accelerators] of migratedValues(userValues)) {
    settings.set_strv(key, accelerators);
  }
  settings.set_int(storageVersionSetting, currentStorageVersion);
}

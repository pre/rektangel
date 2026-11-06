import Gio from 'gi://Gio';
import { translateHyper, type SuperKey } from './accelerator.ts';
import { effectiveAccelerator } from './shortcuts.ts';

/**
 * A copy of the keybinding keys in a memory backend, with <Hyper>
 * translated for the key that the shortcuts use now. Give `settings` to
 * Main.wm.addKeybinding. Mutter watches changed::<key> on that object
 * and grabs the new accelerators, so a change of the stored settings
 * needs only a write to the copy.
 *
 * Mutter cannot grab one combination for two keys. When two keys have the
 * same effective accelerator, the key that is first in `keys` gets it and
 * the copy of the other key does not have it.
 */
export class TranslatedSettings {
  readonly settings: Gio.Settings;
  private readonly handlerId: number;
  private readonly loggedLines = new Set<string>();

  constructor(
    private readonly source: Gio.Settings,
    private readonly keys: readonly string[],
    private superKey: SuperKey,
    private readonly log: (line: string) => void = console.log,
  ) {
    this.settings = Gio.Settings.new_full(source.settings_schema, Gio.memory_settings_backend_new(), null);
    this.copyAll();
    this.handlerId = source.connect('changed', (_settings: Gio.Settings, key: string) => {
      if (this.keys.includes(key)) {
        this.copyAll();
      }
    });
  }

  /** The super-key setting, or 'super' when Caps Lock mode cannot work. */
  setSuperKey(superKey: SuperKey): void {
    if (superKey !== this.superKey) {
      this.superKey = superKey;
      this.copyAll();
    }
  }

  destroy(): void {
    this.source.disconnect(this.handlerId);
  }

  private copyAll(): void {
    const owners = new Map<string, string>();
    for (const key of this.keys) {
      const accelerators: string[] = [];
      for (const accelerator of this.source.get_strv(key)) {
        const effective = effectiveAccelerator(accelerator, this.superKey);
        const owner = owners.get(effective);
        if (effective !== '' && owner !== undefined) {
          this.logOnce(`Rektangel: ${key} and ${owner} are both ${effective}, ${key} is not registered`);
        } else {
          owners.set(effective, key);
          accelerators.push(translateHyper(accelerator, this.superKey));
        }
      }
      this.settings.set_strv(key, accelerators);
    }
  }

  private logOnce(line: string): void {
    if (!this.loggedLines.has(line)) {
      this.loggedLines.add(line);
      this.log(line);
    }
  }
}

import Gio from 'gi://Gio';
import { superKeySetting, translateSuper, type SuperKey } from './accelerator.ts';

/**
 * A copy of the keybinding keys in a memory backend, with <Super>
 * translated for the super-key setting. Give `settings` to
 * Main.wm.addKeybinding. Mutter watches changed::<key> on that object
 * and grabs the new accelerators, so a change of the stored settings
 * needs only a write to the copy.
 */
export class TranslatedSettings {
  readonly settings: Gio.Settings;
  private readonly handlerId: number;

  constructor(
    private readonly source: Gio.Settings,
    private readonly keys: readonly string[],
  ) {
    this.settings = Gio.Settings.new_full(source.settings_schema, Gio.memory_settings_backend_new(), null);
    this.copyAll();
    this.handlerId = source.connect('changed', (_settings: Gio.Settings, key: string) => {
      if (key === superKeySetting) {
        this.copyAll();
      } else if (this.keys.includes(key)) {
        this.copy(key);
      }
    });
  }

  destroy(): void {
    this.source.disconnect(this.handlerId);
  }

  private copyAll(): void {
    this.keys.forEach((key) => this.copy(key));
  }

  private copy(key: string): void {
    const superKey = this.source.get_string(superKeySetting) as SuperKey;
    const accelerators = this.source.get_strv(key).map((accelerator) => translateSuper(accelerator, superKey));
    this.settings.set_strv(key, accelerators);
  }
}

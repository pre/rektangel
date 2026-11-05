/**
 * The values of the gsettings key super-key. The shortcuts are always
 * stored with <Super>. With 'capslock', the extension registers them
 * with <Mod3>, the modifier of the Caps Lock key in the XKB option
 * rektangel:caps_hyper. See ADR 0009.
 */
export type SuperKey = 'super' | 'capslock';

export const superKeySetting = 'super-key';

/** True after Rektangel installed the XKB option. See ADR 0011. */
export const xkbOptionInstalledSetting = 'xkb-option-installed';

/** The accelerator that Mutter must grab for a stored accelerator. */
export function translateSuper(accelerator: string, superKey: SuperKey): string {
  return superKey === 'capslock' ? accelerator.replace(/<super>/gi, '<Mod3>') : accelerator;
}

/**
 * The stored form of an accelerator that was captured while Caps Lock
 * mode is on. GTK names the Caps Lock modifier <Hyper> or <Mod3>.
 */
export function canonicalSuper(accelerator: string): string {
  return accelerator.replace(/<(mod3|hyper)>/gi, '<Super>');
}

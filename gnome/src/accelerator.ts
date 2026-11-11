/**
 * The values of the gsettings key super-key: the physical key of the
 * <Hyper> modifier. A stored <Hyper> is the Rektangel modifier, <Super>
 * the Windows key and <Mod3> Caps Lock, the modifier of the XKB option
 * of ADR 0015. Mutter never gets <Hyper>. See ADR 0009.
 */
export type SuperKey = 'super' | 'capslock';

export const superKeySetting = 'super-key';

/** The CapsLockBehavior of the XKB option. See ADR 0015. */
export const capsLockBehaviorSetting = 'caps-lock-behavior';

/** True after Rektangel installed the XKB option. See ADR 0011. */
export const xkbOptionInstalledSetting = 'xkb-option-installed';

/** The accelerator that Mutter must grab for a stored accelerator. */
export function translateHyper(accelerator: string, superKey: SuperKey): string {
  return accelerator.replace(/<hyper>/gi, superKey === 'capslock' ? '<Mod3>' : '<Super>');
}

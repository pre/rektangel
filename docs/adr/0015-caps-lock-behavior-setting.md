# The Caps Lock behavior is a setting, and both Shift keys toggle caps lock by default

Status: accepted. Supersedes ADR-0008 for the level 2 of the Caps Lock key. Hyper on Mod3 of ADR-0008 stays.

In ADR 0008, Caps Lock is a `TWO_LEVEL` key: `[ Hyper_L, Caps_Lock ]`. XKB selects the level when the key goes down. When the user presses Shift before Caps Lock, the key gives `Caps_Lock` and not Hyper, until the user releases it. A quick sequence such as Caps+Shift+Left, release, Caps+Shift+Right then sometimes sends Shift+Right and Right to the application, and toggles caps lock.

The setting `caps-lock-behavior` selects one of three XKB options. Each option puts Caps Lock on Mod3, so the shortcuts do not change:

| Value | XKB option | Caps lock |
|-------|------------|-----------|
| `both-shifts` (default) | `rektangel:caps_hyper_both_shifts` | Both Shift keys together. Caps Lock is `ONE_LEVEL` `Hyper_L`, and the symbols include the stock `shift(both_capslock)`. |
| `hyper-only` | `rektangel:caps_hyper_only` | Not available. Caps Lock is `ONE_LEVEL` `Hyper_L`. |
| `shift-caps` | `rektangel:caps_hyper` | Shift+Caps Lock, as in ADR 0008. |

The preferences window shows the setting in the Caps Lock group, at the top right. The dropdown is active only when `super-key` is `capslock`.

## Considered Options

- Keep `TWO_LEVEL` and tell users to press Caps Lock before Shift: the order is hard to keep when the user types quickly.
- One option, and change only the symbols file: Mutter loads the keymap again only when `xkb-options` changes, so a new behavior would need a log out.
- Add the stock `shift:both_capslock` to `xkb-options` next to a Rektangel option: two options must then change together, and the Rektangel option alone does not tell the behavior.

## Consequences

- `xkb-options` has one Rektangel option. A change of the option makes Mutter load the keymap again, so a new behavior has an effect at once.
- The extension owns the change. At enable, and when `caps-lock-behavior` or `super-key` changes, it writes the XKB files that are missing or different and replaces the Rektangel option. It does nothing when `xkb-option-installed` is true and `xkb-options` has no Rektangel option, because then the user removed it (ADR 0011).
- The default changes for users of an earlier version: at the first enable after the update, Shift+Caps Lock stops toggling caps lock, and both Shift keys toggle it. The user can select Shift+Caps Lock in the preferences window.
- The XKB step replaces the Rektangel lines of an older version in user rules files, so the new options are in the files.
- Caps Lock mode is active when `xkb-options` has any Rektangel option.

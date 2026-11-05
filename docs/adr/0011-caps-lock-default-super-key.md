# Caps Lock is the default Super key

Status: accepted.

The schema default of `super-key` is `capslock`. When the extension is enabled and `super-key` is `capslock`, the extension installs the user XKB option `rektangel:caps_hyper` of ADR 0008 one time. It does the same when `super-key` changes to `capslock` while it runs. Mutter loads the keymap again when `xkb-options` changes, so Caps Lock is a modifier at once.

The default shortcuts of ADR 0010 are Super+arrow, Super+Shift+arrow, Super+Space and others with Super. With the Windows key as Super, these shortcuts are also GNOME shortcuts (tiling, maximize, move to monitor, input source). Caps Lock with Hyper on Mod3 has no GNOME shortcut, so the defaults work without a change to GNOME, and Super keeps its GNOME function.

## Considered Options

- The Windows key is the default Super key: each machine needs a run of `gnome-keys.sh` before the defaults work, and the user loses the GNOME Super shortcuts.

## Consequences

- On the first enable, the extension writes the XKB files to `~/.config/xkb` and adds `rektangel:caps_hyper` to `xkb-options`. Caps Lock is then a modifier. Shift+Caps Lock toggles caps lock.
- The extension does not remove the option in `disable()`. GNOME disables extensions when the screen locks, and a removal there would change the keymap at each lock. Only the Windows key choice in the preferences window and `hyper/uninstall.sh` remove the option.
- The extension installs the option one time. The setting `xkb-option-installed` records the install, so the extension does not add the option again after the lock screen or after the user removed it. If a `caps:` option conflicts, the option is missing, or the session is X11, the shortcuts fall back to the Windows key.
- `gnome-keys.sh` is necessary only for users who select the Windows key.
- A user who set `super-key` to `super` before keeps that value.

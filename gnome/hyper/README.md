# Caps Lock mode (placeholder)

Phase 5 fills this directory. See ADR 0008.

The plan for this directory:

- A user XKB option in `~/.config/xkb/` maps Caps Lock to `Hyper_L` on Mod3. The key has two levels, `[ Hyper_L, Caps_Lock ]` with type `TWO_LEVEL`. Caps Lock held with another key gives `<Hyper>`. Shift+Caps Lock toggles caps lock.
- The files are `rules/evdev` (with `! include %S/evdev` and one option line), a `rules/evdev.lst` entry, and `symbols/rektangel` with the `<CAPS>` key and `modifier_map Mod3 { <CAPS> }`.
- `install.sh` copies the XKB files, adds the option to `org.gnome.desktop.input-sources xkb-options`, and sets the Rektangel bindings to `<Hyper>...`. `uninstall.sh` reverses these three steps.
- Both scripts run as the normal user and ship in the release zip. No process, no daemon and no root.
- Fallback if the two-level key does not work: the stock option `shift:both_capslock_cancel`.

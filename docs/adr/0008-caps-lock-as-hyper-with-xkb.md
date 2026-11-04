# Caps Lock mode is a user XKB option with Hyper on Mod3

The optional Caps Lock mode is a user XKB option that makes Caps Lock `Hyper_L` on Mod3, and Shift+Caps Lock toggles caps lock (a `TWO_LEVEL` key). Mutter loads the keymap like any keyboard layout, so the mode needs no remapper, no process and no root, and Super keeps its GNOME meaning.

## Considered Options

- Stock XKB option `caps:hyper`: it puts Hyper on Mod4, the same bit as Super, so Caps+Left and Super+Left become the same event.
- evdev remapper with tap-hold: it needs a root service or membership of the `uinput` group.
- Shell extension: an extension gets no raw key events, so it cannot make a modifier from Caps Lock.

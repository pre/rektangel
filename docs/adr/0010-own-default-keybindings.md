# Default keybindings use Super with one key, and only conflicting GNOME entries are removed

Status: accepted. Supersedes ADR-0006.

All default keybindings use Super as the only modifier, with Shift for a second set. The arrow keys move a window to the halves (Super+arrow) and to the corners (Super+Shift+arrow, clockwise: Left is top left, Up is top right, Right is bottom right, Down is bottom left). The other actions use Super with one key: Space maximize, Return maximize height, Period center, Plus larger, Minus smaller, Apostrophe next display, Shift+Apostrophe previous display, BackSpace restore. Thirds, almost maximize and move to edge have no default.

The Rectangle defaults of ADR-0006 were made for macOS, where Cmd+Alt and Ctrl+Alt are free. On GNOME they need two or three modifiers, they conflict with the workspace and overview shortcuts, and in Caps Lock mode (ADR-0009) they give Caps+Alt+arrow. With one modifier, Caps Lock mode gives Caps+arrow.

`gnome-keys.sh` stays the tool that removes only the conflicting entries from the GNOME arrays, keeps the other entries, and saves the old values so that `--undo` can restore them.

## Considered Options

- Keep the Rectangle defaults: Rectangle users keep their muscle memory, but each shortcut needs two or three modifiers.
- Use `<Super>asterisk` for previous display: Mutter compares the keycode and the modifier mask. On a Finnish keyboard the asterisk is Shift+Apostrophe, so `<Super>asterisk` does not match the key press. `<Super><Shift>apostrophe` matches.

## Consequences

- The defaults conflict with more GNOME defaults than before: Super+Left and Super+Right (tiling), Super+Up and Super+Down (maximize, unmaximize), Super+Shift+arrow (move to monitor) and Super+Space (input source). Run `gnome-keys.sh` after the update. Since ADR 0011, Caps Lock is the default Super key, and these conflicts apply only to users who select the Windows key.
- The keys of Plus, Minus and Apostrophe are for a Finnish keyboard. On other layouts these key names can be on other keys or need Shift.
- A user who changed a shortcut keeps the value. A changed shortcut can now be equal to a new default of another action, and then the two actions use the same key until the user changes one.

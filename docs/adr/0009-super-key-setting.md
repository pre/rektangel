# Shortcuts are stored with Super and translated at registration

Status: superseded by ADR-0013 for the storage form; the translation stays.

The shortcuts are always stored in gsettings with `<Super>`. A setting `super-key` (`super` or `capslock`) selects the key for that modifier. With `capslock`, the extension gives Mutter a copy of the shortcuts in a memory settings backend, in which each `<Super>` is `<Mod3>`, the modifier of the Caps Lock key of ADR 0008. One change of `super-key` switches all shortcuts, and the user does not edit 26 shortcuts.

## Considered Options

- Store the Caps Lock form in gsettings, and let the scripts rewrite all shortcuts: the switch back needs a backup of each shortcut, and a shortcut that the user changes in Caps Lock mode is lost or must be translated back.
- Bind the two forms at the same time: Super and Caps Lock then both use each shortcut, and the user cannot give Super back to GNOME.
- Translate in the preferences window only: the shortcuts from gsettings or dconf-editor are not translated.

## Consequences

- Mutter watches `changed::<key>` on the settings object that `Main.wm.addKeybinding` gets. When a stored shortcut or `super-key` changes, the extension writes the new values to the memory copy, and Mutter grabs them again. The extension does not remove and add keybindings for a change.
- Rektangel registers `<Mod3>`, not `<Hyper>`. Mutter 46 expands `<Hyper>` to every real modifier that the Hyper virtual modifier maps to, which with the keymap of ADR 0008 is Lock, Mod3 and Mod4. Mutter removes Lock from key events, so a `<Hyper>` binding never matches.
- In Caps Lock mode, the shortcuts keep the modifiers that the defaults need only for Super: Super+Alt+Left becomes Caps+Alt+Left. To get Caps+Left, store `<Super>Left`.
- `gnome-keys.sh` compares the stored `<Super>` form, so a change of `super-key` does not need a new run.
- `super-key = capslock` without the XKB option disables all shortcuts with Super, because no key sets Mod3. The preferences window and `hyper/install.sh` set both with the same XKB step (`gnome/src/capslock-mode.ts`).

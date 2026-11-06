# GNOME Shell extension

The user documentation is in the README.md of the repository. This file describes the modules that more than one process uses.

## Hyper key and Caps Lock mode

The stored shortcuts use three modifier tokens. `<Hyper>` is the Rektangel modifier, `<Super>` is the physical Windows key and `<Mod3>` is the physical Caps Lock. The defaults use `<Hyper>`. The gsettings key `super-key` (`'capslock'`, the default, or `'super'`) selects the physical key of `<Hyper>`. Mutter never gets `<Hyper>`. See ADR 0009 and ADR 0013.

`src/accelerator.ts` has no imports:

- `translateHyper(accelerator, superKey)`: the accelerator that Mutter grabs. `<Hyper>` becomes `<Mod3>` with `'capslock'` and `<Super>` with `'super'`. `<Super>` and `<Mod3>` do not change.
- `superKeySetting`: the name of the gsettings key, `'super-key'`.

`src/shortcuts.ts` has the pure functions of the shortcuts:

- `effectiveAccelerator(accelerator, superKey)`: `translateHyper`, then `normalizeAccelerator`. All comparisons between Rektangel shortcuts, and between a Rektangel shortcut and a GNOME shortcut, use this form.
- `acceleratorLabelParts(accelerator)`: the names of the modifiers, Hyper, Windows, Caps Lock, Shift, Ctrl, Alt and Meta, and the key token. The preferences window makes the label of the key from the token with GTK.
- `capturedAccelerator(held, key)`: the stored form of a key press in the capture dialog, `<Super>` for the Windows key and `<Mod3>` for Caps Lock, in the order `<Shift><Control><Alt><Super><Mod3>` and the key name.

`src/migrate.ts` changes the values of v0.1.0, in which a stored `<Super>` was the Rektangel modifier:

- `migratedValues(userValues)`: a pure function. It gets the user-set values of the keybinding keys and gives the values that changed, with `<Hyper>` in place of `<Super>`.
- `migrateStoredShortcuts(settings, keys)`: when `storage-version` is 0, writes the changed values and sets `storage-version` to 1. The extension calls it at enable.

`src/capslock-mode.ts` uses only Gio and GLib, so the preferences process can import it. The hyper scripts run it with `gjs` through `hyper/capslock-mode.js`.

- `installXkbOption(extensionPath, context?)`: copies the XKB files of `extensionPath/hyper/xkb` to `$XDG_CONFIG_HOME/xkb`, or adds the Rektangel lines to the user files that are there. Then it adds `rektangel:caps_hyper` to `org.gnome.desktop.input-sources xkb-options`. It throws an `Error` with a message for the user, before it changes something, if `xkb-options` has a `caps:` option.
- `removeXkbOption(extensionPath, context?)`: removes the option, then the Rektangel files and lines. Other options and lines stay.
- `isXkbOptionInstalled(inputSources?)`: true when `xkb-options` has the option.
- `ensureXkbOption(superKey, extensionPath, context?)`: calls `installXkbOption` when `superKey` is `'capslock'` and `xkb-options` does not have the option. Returns true when it installed the option. The extension calls it at enable and when `super-key` changes (ADR 0011).

Both steps do nothing a second time. In the extension and the preferences window, `extensionPath` is `this.path`. `context` is for tests and the scripts: `configDir`, `inputSources` (a `Gio.Settings`), `dryRun` and `log`.

To turn on Caps Lock mode, call `installXkbOption` first and then set `super-key` to `'capslock'`. To turn it off, set `super-key` to `'super'` and then call `removeXkbOption`. In this order, the Hyper shortcuts never point to a key that does not set Mod3.

`src/translated-settings.ts` is for the extension process: it keeps the copy of the shortcuts that Mutter reads, with `<Hyper>` translated. When two keys have the same effective accelerator, only the key that is first in `allActions` order gets it, and the extension writes one journal line.

## Tests

`npm test --workspace gnome` runs the unit tests with Node.js, `test/gnome-keys-normalize.sh` (the jq normalizer of `gnome-keys.sh` with the pairs of `test/fixtures/accelerators.json`, the same pairs as the TypeScript test), then two GJS tests: `test/gjs-smoke.js` (core and config.toml) and `test/gjs-capslock.js` (the Hyper translation, one owner for each shortcut, the migration and the XKB steps, with memory settings backends and a temporary directory).

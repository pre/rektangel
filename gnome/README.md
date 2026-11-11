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

- `installXkbOption(extensionPath, behavior, context?)`: copies the XKB files of `extensionPath/hyper/xkb` to `$XDG_CONFIG_HOME/xkb`, or adds the Rektangel lines to the user files that are there, in place of the lines of an older version. Then it makes the option of `behavior` (ADR 0015) the only Rektangel option in `org.gnome.desktop.input-sources xkb-options`. It throws an `Error` with a message for the user, before it changes something, if `xkb-options` has a `caps:` option.
- `removeXkbOption(context?)`: removes the Rektangel options, then the Rektangel files and lines. Other options and lines stay.
- `ensureXkbOption(settings, extensionPath, context?)`: when `super-key` is `'capslock'`, calls `installXkbOption` with `caps-lock-behavior`. It does nothing when `xkb-option-installed` is true and `xkb-options` has no Rektangel option, because the user removed it. Returns true when it changed a file or the option. The extension calls it at enable and when `super-key` or `caps-lock-behavior` changes (ADR 0011, ADR 0015).

Both steps do nothing a second time. In the extension and the preferences window, `extensionPath` is `this.path`. `context` is for tests and the scripts: `configDir`, `inputSources` (a `Gio.Settings`), `dryRun` and `log`.

To turn on Caps Lock mode, call `installXkbOption` first and then set `super-key` to `'capslock'`. To turn it off, set `super-key` to `'super'` and then call `removeXkbOption`. In this order, the Hyper shortcuts never point to a key that does not set Mod3.

`src/translated-settings.ts` is for the extension process: it keeps the copy of the shortcuts that Mutter reads, with `<Hyper>` translated. When two keys have the same effective accelerator, only the key that is first in `allActions` order gets it, and the extension writes one journal line.

## Show or hide app windows

The gsettings key `app-toggles` (`a(ss)`) has the entries: an app identifier and an accelerator in the stored form. An accelerator can be a key without a modifier. See ADR 0017.

`src/app-toggles.ts` has no GNOME imports:

- `parseAppToggles`, `serializeAppToggles`: the entries and the unpacked `a(ss)` value.
- `isValidAppId`, `isValidAccelerator`: the checks before a value from gsettings is used. The identifier is never part of a command line.
- `windowMatchesApp(app, window)`: true when the identifier is equal to one of the identifiers of the window, without case and without a `.desktop` suffix.
- `planGrabs(entries, actions, superKey)`: the accelerators to grab, with `<Hyper>` translated, and one journal line for each entry that does not get its shortcut. The actions own their shortcuts first, then the entries in list order.
- `toggleDecision(input)`: start, hide or show, and which windows to minimize, unminimize, raise and focus.
- `pickedIdentifier`, `topWindowAt`: the identifier of a clicked window and the window at a point.

`src/app-toggle-shell.ts` (extension process): grabs the shortcuts with `global.display.grab_accelerator`, handles `accelerator-activated`, and applies the decision. It grabs again after a change of `app-toggles`, of an action shortcut or of the Hyper key, in an idle callback with a lower priority than the keybinding update of Mutter.

`src/pick-window.ts` (extension process): exports the D-Bus object `/pet/repo/Rektangel` with the interface `pet.repo.Rektangel` on the bus connection of GNOME Shell, bus name `org.gnome.Shell`. The method `PickWindow() -> (identifier, name)` returns the app of the next window that the user clicks, or two empty strings when the user cancels or after 30 seconds. A second call while a pick is active gets the error `pet.repo.Rektangel.Error.Busy`. The object exists only while the extension is enabled.

```sh
gdbus call --session --dest org.gnome.Shell --object-path /pet/repo/Rektangel --method pet.repo.Rektangel.PickWindow
```

`src/prefs-app-toggles.ts` (preferences process): the group of the entries and the add dialog.

## Tests

`npm test --workspace gnome` runs the unit tests with Node.js, `test/gnome-keys-normalize.sh` (the jq normalizer of `gnome-keys.sh` with the pairs of `test/fixtures/accelerators.json`, the same pairs as the TypeScript test), then two GJS tests: `test/gjs-smoke.js` (core and config.toml) and `test/gjs-capslock.js` (the Hyper translation, one owner for each shortcut, the migration and the XKB steps, with memory settings backends and a temporary directory).

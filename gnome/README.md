# GNOME Shell extension

The user documentation is in the README.md of the repository. This file describes the modules that more than one process uses.

## Super key and Caps Lock mode

The shortcuts are stored with `<Super>`. The gsettings key `super-key` (`'capslock'`, the default, or `'super'`) selects the key for that modifier. See ADR 0009.

`src/accelerator.ts` has no imports:

- `translateSuper(accelerator, superKey)`: the accelerator that Mutter grabs. With `'capslock'`, `<Super>` becomes `<Mod3>`.
- `canonicalSuper(accelerator)`: the stored form of an accelerator that was captured in Caps Lock mode. `<Mod3>` and `<Hyper>` become `<Super>`.
- `superKeySetting`: the name of the gsettings key, `'super-key'`.

`src/capslock-mode.ts` uses only Gio and GLib, so the preferences process can import it. The hyper scripts run it with `gjs` through `hyper/capslock-mode.js`.

- `installXkbOption(extensionPath, context?)`: copies the XKB files of `extensionPath/hyper/xkb` to `$XDG_CONFIG_HOME/xkb`, or adds the Rektangel lines to the user files that are there. Then it adds `rektangel:caps_hyper` to `org.gnome.desktop.input-sources xkb-options`. It throws an `Error` with a message for the user, before it changes something, if `xkb-options` has a `caps:` option.
- `removeXkbOption(extensionPath, context?)`: removes the option, then the Rektangel files and lines. Other options and lines stay.
- `isXkbOptionInstalled(inputSources?)`: true when `xkb-options` has the option.
- `ensureXkbOption(superKey, extensionPath, context?)`: calls `installXkbOption` when `superKey` is `'capslock'` and `xkb-options` does not have the option. Returns true when it installed the option. The extension calls it at enable and when `super-key` changes (ADR 0011).

Both steps do nothing a second time. In the extension and the preferences window, `extensionPath` is `this.path`. `context` is for tests and the scripts: `configDir`, `inputSources` (a `Gio.Settings`), `dryRun` and `log`.

To turn on Caps Lock mode, call `installXkbOption` first and then set `super-key` to `'capslock'`. To turn it off, set `super-key` to `'super'` and then call `removeXkbOption`. In this order, the Super shortcuts never point to a key that does not set Mod3.

`src/translated-settings.ts` is for the extension process: it keeps the copy of the shortcuts that Mutter reads.

## Tests

`npm test --workspace gnome` runs the unit tests with Node.js, `test/gnome-keys-normalize.sh` (the jq normalizer of `gnome-keys.sh` with the pairs of `test/fixtures/accelerators.json`, the same pairs as the TypeScript test), then two GJS tests: `test/gjs-smoke.js` (core and config.toml) and `test/gjs-capslock.js` (the super-key translation and the XKB steps, with memory settings backends and a temporary directory).

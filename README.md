# Rektangel

Rektangel moves and resizes windows with keyboard shortcuts on Linux. It is a port of [Rectangle](https://github.com/rxhanson/Rectangle) for macOS. The first platform is GNOME Shell 46 on Wayland.

## Status

Early development. The extension binds all keys and moves the focused window. Some window calculations are not ready yet: an action without a calculation does nothing.

Actions in scope: halves, corners, thirds, maximize, almost maximize, maximize height, center, larger, smaller, move to edge, next and previous display, and restore. Rektangel is keyboard only: there are no snap areas, no mouse actions and no animations.

## Install the release zip

You do not need Node.js. GNOME Shell runs the extension.

1. Download `rektangel@repo.pet.zip` from the GitHub release.
2. Install it:

   ```sh
   gnome-extensions install rektangel@repo.pet.zip
   ```

3. Log out and log in again. On Wayland, GNOME Shell loads new extensions only at login.
4. Enable the extension:

   ```sh
   gnome-extensions enable rektangel@repo.pet
   ```

When you enable the extension the first time, Caps Lock becomes the Super key of the Rektangel shortcuts: hold Caps Lock and press Left to move a window to the left half. Shift+Caps Lock still toggles caps lock. The extension writes a user XKB option to `~/.config/xkb` and adds `rektangel:caps_hyper` to `xkb-options`. The change usually has an effect at once, at the latest after you log out and in. The Windows key keeps its GNOME function. To use the Windows key for the Rektangel shortcuts and get a normal Caps Lock back, select Windows key in the Super Key group of the preferences window. See Caps Lock mode below.

### GNOME conflicts with the Windows key

With Caps Lock as the Super key, the default shortcuts do not conflict with GNOME. If you select the Windows key, some default shortcuts are also GNOME shortcuts. On GNOME 46 these GNOME defaults conflict:

| Rektangel default        | GNOME key                                                        |
|--------------------------|------------------------------------------------------------------|
| Super+Left, Super+Right  | `org.gnome.mutter.keybindings` `toggle-tiled-left`, `toggle-tiled-right` |
| Super+Up                 | `org.gnome.desktop.wm.keybindings` `maximize`                    |
| Super+Down               | `org.gnome.desktop.wm.keybindings` `unmaximize`                  |
| Super+Shift+arrow keys   | `org.gnome.desktop.wm.keybindings` `move-to-monitor-left`, `-right`, `-up`, `-down` |
| Super+Space              | `org.gnome.desktop.wm.keybindings` `switch-input-source`         |
| Super+Period             | `org.freedesktop.ibus.panel.emoji` `hotkey` (IBus emoji)         |

Ubuntu sets `maximize` and `unmaximize` to empty in the Ubuntu session, so on Ubuntu Super+Up and Super+Down are free. The other defaults (Super+Return, Super+Plus, Super+Minus, Super+Apostrophe, Super+Shift+Apostrophe and Super+Backspace) have no GNOME 46 shortcut. IBus is not a part of GNOME Shell, but in some applications, for example GNOME Terminal, the IBus emoji hotkey gets Super+Period before Rektangel does. IBus also has Super+Semicolon for emoji and Ctrl+Shift+U for Unicode input. Other extensions can also use these keys, for example Tiling Assistant uses Super+Up and Super+Down.

With the Windows key, use `gnome-keys.sh` to remove the GNOME conflicts. The script is in the zip, and it removes only the conflicting GNOME entries. It reads the current Rektangel shortcuts, so run it again after you change a shortcut. It removes each GNOME entry that is equal to a Rektangel shortcut from these schemas: `org.gnome.desktop.wm.keybindings`, `org.gnome.mutter.keybindings`, `org.gnome.mutter.wayland.keybindings`, `org.gnome.shell.keybindings`, `org.gnome.settings-daemon.plugins.media-keys` and `org.freedesktop.ibus.panel.emoji` (IBus emoji). The script skips a schema that is not installed, for example the IBus schema on a system without IBus. The other entries of a key stay, so Super+Semicolon stays for the IBus emoji picker. The order of the modifiers does not matter, and neither does the case of a modifier or of a one-letter key. The script needs `gsettings`, `dconf` and `jq`. It saves the old values to `~/.config/rektangel/gnome-keys-backup.json` before it changes them. A key that is in the backup from an earlier run keeps its first value. `--undo` sets the old values again, or resets a key that had the GNOME default.

```sh
dir=~/.local/share/gnome-shell/extensions/rektangel@repo.pet
bash "$dir/gnome-keys.sh" --dry-run   # show the changes
bash "$dir/gnome-keys.sh"             # do the changes
bash "$dir/gnome-keys.sh" --undo      # restore the old values
```

The script reads the Rektangel schema from the installed extension. To use another compiled schema, give `--schemadir DIR`. When `super-key` is `capslock`, Rektangel grabs the Super shortcuts with Caps Lock, so the script compares only the shortcuts without Super. The conflict badges and the dialog of the preferences window use the same rule (see Caps Lock mode).

The scripts use `/usr/bin/gsettings` and `/usr/bin/dconf` when they exist. A `gsettings` from Homebrew or linuxbrew GLib often has no dconf backend. It then writes to a keyfile, and GNOME Shell does not see the change. Before a script changes a value, it compares `gsettings` with `dconf` and stops if they do not agree. When you run `gsettings` yourself, use `/usr/bin/gsettings`.

## Default shortcuts

| Action           | Shortcut                 |
|------------------|--------------------------|
| Left half        | Super+Left               |
| Right half       | Super+Right              |
| Top half         | Super+Up                 |
| Bottom half      | Super+Down               |
| Top left         | Super+Shift+Left         |
| Top right        | Super+Shift+Up           |
| Bottom left      | Super+Shift+Down         |
| Bottom right     | Super+Shift+Right        |
| Maximize         | Super+Space              |
| Maximize height  | Super+Return             |
| Center           | Super+Period             |
| Larger           | Super+Plus               |
| Smaller          | Super+Minus              |
| Next display     | Super+Apostrophe         |
| Previous display | Super+Shift+Apostrophe   |
| Restore          | Super+Backspace          |

Super is Caps Lock by default, so Super+Left is Caps Lock+Left. The corners go clockwise from the arrow key: Left is top left, Up is top right, Right is bottom right and Down is bottom left. The keys are for a Finnish keyboard, on which Plus and Minus have no Shift and Apostrophe is the key to the right of Ä. On a Finnish keyboard, Shift+Apostrophe is the asterisk, so the previous display shortcut shows as Super+*. Mutter compares the key and the modifiers, so the stored form is `<Super><Shift>apostrophe`, not `<Super>asterisk`. On other layouts, the same key names can be on other keys, or need Shift. See ADR 0010.

Thirds, almost maximize and move to edge have no default shortcut. Each shortcut is a gsettings key in `org.gnome.shell.extensions.rektangel`. To change one, use the preferences window (see below), `gsettings` or dconf-editor. The schema is in the extension directory, so give `gsettings` the schema directory:

```sh
schemas=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/schemas
gsettings --schemadir "$schemas" set org.gnome.shell.extensions.rektangel first-third "['<Super><Alt>e']"
```

## Preferences

The preferences window shows all actions and their shortcuts in two columns. To open it, open the Extensions app, then open Rektangel and click Settings. Or run:

```sh
gnome-extensions prefs rektangel@repo.pet
```

Click the shortcut button of an action, press the new key combination, and click Set. A click on the other parts of the row does nothing. An action without a shortcut shows "Set shortcut…". Escape cancels. Backspace disables the action. The window does not accept a combination that another Rektangel action uses. A shortcut must have Ctrl, Alt or Super. The undo button on a row sets the default shortcut of that action again, and Reset to defaults sets all defaults. A change has an effect immediately. If GNOME uses the combination, the dialog shows the GNOME shortcut and a Remove from GNOME button. If the IBus emoji picker uses it, the dialog tells what IBus does with it and shows a Turn off the IBus emoji shortcut button. Each button removes only that combination from its shortcut and writes the old value to the backup file of `gnome-keys.sh`, so `gnome-keys.sh --undo` restores it. If the keys that you press do not appear in the dialog, GNOME already uses them: remove them with `gnome-keys.sh` (see above) or in Settings > Keyboard > View and Customize Shortcuts.

A red warning badge before a shortcut shows that GNOME or another Rektangel action uses the same keys: click it to see the conflicts and to remove a GNOME entry, with the same backup as in the dialog.

The Super Key group at the top selects the key that is Super for Rektangel: Caps Lock (the default) or the Windows key. All shortcuts are stored with Super, so this setting changes all of them at once. Caps Lock adds the XKB option, and Windows key removes it. The change usually has an effect at once, at the latest after you log out and in.

When you set a shortcut for the first time, GNOME can ask if the Extensions app may inhibit shortcuts. Allow it, otherwise GNOME Shell gets the key combination before the window does.

After you install a version that adds the preferences window over an older version, log out and in once. GNOME Shell checks for a preferences window only when it loads the extension.

## Settings file

Rektangel reads `~/.config/rektangel/config.toml` when the extension is enabled. If you change the file, disable and enable the extension, or log out and in. All keys are optional. A missing file gives the defaults. If the file has an error, Rektangel uses the defaults for all keys and writes one warning to the journal (`journalctl --user -o cat /usr/bin/gnome-shell | grep Rektangel`).

```toml
# Fractions of the work area that halves and corners cycle through when
# you press the same shortcut again.
cycle_sizes = [0.5, 0.6667, 0.3333]

# Pixels that larger and smaller add or remove on each side.
step_size = 30

# The axis along which a repeated corner action expands: "horizontal" or "vertical".
corner_axis = "horizontal"

# Fraction of the work area for almost maximize.
almost_maximize_ratio = 0.9
```

The file uses a subset of TOML: `key = value` lines, numbers, quoted strings, one-line lists of numbers and `#` comments.

## Caps Lock mode

Caps Lock mode is the default. It makes Caps Lock the Super key of the Rektangel shortcuts: hold Caps Lock instead of Super. Shift+Caps Lock toggles caps lock. Super keeps its GNOME function.

The shortcuts are always stored with Super. The setting `super-key` (`capslock`, the default, or `super`) selects the key, so one change switches all shortcuts. Rektangel registers the shortcuts with Caps Lock when the value is `capslock`. Caps Lock mode also needs a user XKB option. When `super-key` is `capslock`, the extension installs the option one time, when it is enabled or when the setting changes. The setting `xkb-option-installed` records the install, so the extension does not add the option again after the lock screen or after you removed it in Tweaks. The extension does not remove the option when it is disabled.

To switch back to the Windows key, select Windows key in the preferences window. It removes the option and sets `super-key` to `super`. Without the preferences window, run `hyper/uninstall.sh`. Caps Lock mode cannot work when `xkb-options` has another `caps:` option, for example `caps:escape`, when `xkb-options` does not have `rektangel:caps_hyper`, or in an X11 session, because the X server does not read user XKB rules. Then the extension writes the reason to the journal one time and registers the shortcuts with the Windows key. When you select Caps Lock, the Super Key group of the preferences window shows the reason in red and a button that installs the option again (not on X11). When the problem is gone, the shortcuts use Caps Lock again. See `gnome/hyper/README.md`, ADR 0009 and ADR 0011.

## Build from source

You need Node.js 22, npm, `glib-compile-schemas`, `gjs` and `zip`.

```sh
npm install
npm run build   # core with tsc, extension with esbuild, to gnome/dist/
npm test        # unit tests, and the GJS smoke and Caps Lock tests
npm run pack    # writes rektangel@repo.pet.zip
```

To check the Caps Lock mode XKB files offline, run `npm run test:xkb --workspace gnome`. It needs `xkbcomp`.

`gnome/install.sh` builds the extension and copies it to `~/.local/share/gnome-shell/extensions/`. Use it for development only.

### Preview the preferences window

GNOME Shell keeps the prefs code of an extension until the next login. To see a change to the preferences window at once, run:

```sh
npm run prefs                 # uses your real settings
npm run prefs-sandbox         # uses temporary settings, nothing real changes
```

The script `gnome/prefs-dev.sh` builds `gnome/dist` and opens `gnome/dist/prefs.js` with `gnome/test/prefs-launcher.js`. The window uses the schema in `gnome/dist/schemas`, not the installed schema. Without `--sandbox`, a change in the window changes the settings of your session, the same as the installed preferences window. With `--sandbox`, the settings go to a keyfile in a temporary directory under `$HOME/tmp`, and the script deletes the directory when you close the window. The script needs the gnome-shell typelibs in `/usr/lib*/gnome-shell/girepository-1.0`.

## Publish a release

```sh
bin/release-github v1.2.3    # or major, minor or patch
```

The script makes a draft GitHub release at HEAD, with notes from the conventional commits since the previous `v*` tag. Then it starts `.github/workflows/release.yml`. The workflow runs the tests, writes the version to `version-name` in `metadata.json`, packs `rektangel@repo.pet.zip` and attaches the zip to the draft. When the build is done, the script opens the draft. Examine the draft and press **Publish release**. Publishing creates the git tag. Then upload the same zip at https://extensions.gnome.org/upload/.

## Repository layout

- `core/`: the window calculations, shared by all platforms. See `core/README.md`.
- `gnome/`: the GNOME Shell extension. See `gnome/README.md`.
- `docs/adr/`: the architecture decisions. Read them before you change the architecture.

## License

MIT, see `LICENSE`. Rektangel ports calculations and defaults from Rectangle, Copyright (c) 2019-2026 Ryan Hanson, which is also MIT licensed.

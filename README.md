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

Some default shortcuts are also GNOME shortcuts. On GNOME 46 these GNOME defaults conflict:

| Rektangel default        | GNOME key                                                        |
|--------------------------|------------------------------------------------------------------|
| Super+Left, Super+Right  | `org.gnome.mutter.keybindings` `toggle-tiled-left`, `toggle-tiled-right` |
| Super+Up                 | `org.gnome.desktop.wm.keybindings` `maximize`                    |
| Super+Down               | `org.gnome.desktop.wm.keybindings` `unmaximize`                  |
| Super+Shift+arrow keys   | `org.gnome.desktop.wm.keybindings` `move-to-monitor-left`, `-right`, `-up`, `-down` |
| Super+Space              | `org.gnome.desktop.wm.keybindings` `switch-input-source`         |

Ubuntu sets `maximize` and `unmaximize` to empty in the Ubuntu session, so on Ubuntu Super+Up and Super+Down are free. The other defaults (Super+Return, Super+Period, Super+Plus, Super+Minus, Super+Apostrophe, Super+Shift+Apostrophe and Super+BackSpace) have no GNOME 46 shortcut. IBus has Super+Period for emoji (`org.freedesktop.ibus.panel.emoji hotkey`). The script does not change IBus keys, because GNOME Shell gets the key before IBus does. Other extensions can also use these keys, for example Tiling Assistant uses Super+Up and Super+Down.

Use `gnome-keys.sh` to remove the GNOME conflicts. The script is in the zip, and it removes only the conflicting GNOME entries. It reads the current Rektangel shortcuts, so run it again after you change a shortcut. It removes each GNOME entry that is equal to a Rektangel shortcut from these schemas: `org.gnome.desktop.wm.keybindings`, `org.gnome.mutter.keybindings`, `org.gnome.mutter.wayland.keybindings`, `org.gnome.shell.keybindings` and `org.gnome.settings-daemon.plugins.media-keys`. The other entries of a key stay. The order of the modifiers does not matter, and neither does the case of a modifier or of a one-letter key. The script needs `gsettings`, `dconf` and `jq`. It saves the old values to `~/.config/rektangel/gnome-keys-backup.json` before it changes them. A key that is in the backup from an earlier run keeps its first value. `--undo` sets the old values again, or resets a key that had the GNOME default.

```sh
dir=~/.local/share/gnome-shell/extensions/rektangel@repo.pet
bash "$dir/gnome-keys.sh" --dry-run   # show the changes
bash "$dir/gnome-keys.sh"             # do the changes
bash "$dir/gnome-keys.sh" --undo      # restore the old values
```

The script reads the Rektangel schema from the installed extension. To use another compiled schema, give `--schemadir DIR`. The script compares the stored shortcuts, which always use Super, also when `super-key` is `capslock` (see Caps Lock mode).

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
| Restore          | Super+BackSpace          |

The corners go clockwise from the arrow key: Left is top left, Up is top right, Right is bottom right and Down is bottom left. The keys are for a Finnish keyboard, on which Plus and Minus have no Shift and Apostrophe is the key to the right of Ä. On a Finnish keyboard, Shift+Apostrophe is the asterisk, so the previous display shortcut shows as Super+*. Mutter compares the key and the modifiers, so the stored form is `<Super><Shift>apostrophe`, not `<Super>asterisk`. On other layouts, the same key names can be on other keys, or need Shift. See ADR 0010.

Thirds, almost maximize and move to edge have no default shortcut. Each shortcut is a gsettings key in `org.gnome.shell.extensions.rektangel`. To change one, use the preferences window (see below), `gsettings` or dconf-editor. The schema is in the extension directory, so give `gsettings` the schema directory:

```sh
schemas=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/schemas
gsettings --schemadir "$schemas" set org.gnome.shell.extensions.rektangel first-third "['<Super><Alt>e']"
```

## Preferences

The preferences window shows all actions and their shortcuts. To open it, open the Extensions app, then open Rektangel and click Settings. Or run:

```sh
gnome-extensions prefs rektangel@repo.pet
```

Click an action, press the new key combination, and click Set. Escape cancels. BackSpace disables the action. The window does not accept a combination that another Rektangel action uses. A shortcut must have Ctrl, Alt or Super. The undo button on a row sets the default shortcut of that action again, and Reset All sets all defaults. A change has an effect immediately. If GNOME uses the combination, the dialog shows the GNOME shortcut and a Remove from GNOME button. The button removes only that combination from the GNOME shortcut and writes the old value to the backup file of `gnome-keys.sh`, so `gnome-keys.sh --undo` restores it. If the keys that you press do not appear in the dialog, GNOME already uses them: remove them with `gnome-keys.sh` (see above) or in Settings > Keyboard > View and Customize Shortcuts.

The Super Key group at the top selects the key that is Super for Rektangel: the Windows key or Caps Lock. All shortcuts are stored with Super, so this setting changes all of them at once. A change to Caps Lock has an effect after you log out and in.

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

Caps Lock mode is optional. It makes Caps Lock the Super key of the Rektangel shortcuts: hold Caps Lock instead of Super. Shift+Caps Lock toggles caps lock. Super keeps its GNOME function.

The shortcuts are always stored with Super. The setting `super-key` (`super` or `capslock`) selects the key, so one change switches all shortcuts. Rektangel registers the shortcuts with Caps Lock when the value is `capslock`. Caps Lock mode also needs a user XKB option. The `hyper` directory of the extension has scripts that install the option and set `super-key`. See `gnome/hyper/README.md` and ADR 0009.

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

## Repository layout

- `core/`: the window calculations, shared by all platforms. See `core/README.md`.
- `gnome/`: the GNOME Shell extension. See `gnome/README.md`.
- `docs/adr/`: the architecture decisions. Read them before you change the architecture.

## License

MIT, see `LICENSE`. Rektangel ports calculations and defaults from Rectangle, Copyright (c) 2019-2026 Ryan Hanson, which is also MIT licensed.

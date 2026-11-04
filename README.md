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

Some default shortcuts are also GNOME shortcuts, for example Super+Alt+Left. To remove only the conflicting GNOME entries, run the script that is in the zip. It needs `gsettings`, `dconf` and `jq`. It saves the old values to `~/.config/rektangel/gnome-keys-backup.json` before it changes them. `--undo` sets the old values again, or resets a key that had the GNOME default.

```sh
dir=~/.local/share/gnome-shell/extensions/rektangel@repo.pet
bash "$dir/gnome-keys.sh" --dry-run   # show the changes
bash "$dir/gnome-keys.sh"             # do the changes
bash "$dir/gnome-keys.sh" --undo      # restore the old values
```

The scripts use `/usr/bin/gsettings` and `/usr/bin/dconf` when they exist. A `gsettings` from Homebrew or linuxbrew GLib often has no dconf backend. It then writes to a keyfile, and GNOME Shell does not see the change. Before a script changes a value, it compares `gsettings` with `dconf` and stops if they do not agree. When you run `gsettings` yourself, use `/usr/bin/gsettings`.

## Default shortcuts

| Action           | Shortcut                 |
|------------------|--------------------------|
| Left half        | Super+Alt+Left           |
| Right half       | Super+Alt+Right          |
| Top half         | Super+Alt+Up             |
| Bottom half      | Super+Alt+Down           |
| Maximize         | Super+Alt+F              |
| Center           | Super+Alt+C              |
| Maximize height  | Ctrl+Alt+Shift+Up        |
| Larger           | Ctrl+Alt+Shift+Right     |
| Smaller          | Ctrl+Alt+Shift+Left      |
| Previous display | Ctrl+Alt+Super+Left      |
| Next display     | Ctrl+Alt+Super+Right     |
| Top left         | Ctrl+Super+Left          |
| Top right        | Ctrl+Super+Right         |
| Bottom left      | Ctrl+Shift+Super+Left    |
| Bottom right     | Ctrl+Shift+Super+Right   |
| Restore          | Ctrl+Alt+BackSpace       |

Thirds, almost maximize and move to edge have no default shortcut. Each shortcut is a gsettings key in `org.gnome.shell.extensions.rektangel`. To change one, use `gsettings` or dconf-editor. The schema is in the extension directory, so give `gsettings` the schema directory:

```sh
schemas=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/schemas
gsettings --schemadir "$schemas" set org.gnome.shell.extensions.rektangel first-third "['<Super><Alt>e']"
```

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

Caps Lock mode is optional. It makes Caps Lock the Rektangel key: hold Caps Lock and press an arrow key. Shift+Caps Lock toggles caps lock. The scripts for it are in the `hyper` directory of the extension. See `gnome/hyper/README.md`.

## Build from source

You need Node.js 22, npm, `glib-compile-schemas`, `gjs` and `zip`.

```sh
npm install
npm run build   # core with tsc, extension with esbuild, to gnome/dist/
npm test        # core and config.toml unit tests, and the GJS smoke test
npm run pack    # writes rektangel@repo.pet.zip
```

To check the Caps Lock mode XKB files offline, run `npm run test:xkb --workspace gnome`. It needs `xkbcomp`.

`gnome/install.sh` builds the extension and copies it to `~/.local/share/gnome-shell/extensions/`. Use it for development only.

## Repository layout

- `core/`: the window calculations, shared by all platforms. See `core/README.md`.
- `gnome/`: the GNOME Shell extension.
- `docs/adr/`: the architecture decisions. Read them before you change the architecture.

## License

MIT, see `LICENSE`. Rektangel ports calculations and defaults from Rectangle, Copyright (c) 2019-2026 Ryan Hanson, which is also MIT licensed.

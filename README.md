# Rektangel

Rektangel moves and resizes windows with keyboard shortcuts on Linux. It is a port of [Rectangle](https://github.com/rxhanson/Rectangle) for macOS. The first platform is GNOME Shell 46 on Wayland.

## Status

Early development. The extension binds the keys, but the actions only write a log line. The window calculations come in the next phase.

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

Some default shortcuts are also GNOME shortcuts, for example Super+Alt+Left. To remove only the conflicting GNOME entries, run the script that is in the zip. It needs `gsettings` and `jq`, and it saves the old values to `~/.config/rektangel/gnome-keys-backup.json`.

```sh
dir=~/.local/share/gnome-shell/extensions/rektangel@repo.pet
bash "$dir/gnome-keys.sh" --dry-run   # show the changes
bash "$dir/gnome-keys.sh"             # do the changes
bash "$dir/gnome-keys.sh" --undo      # restore the old values
```

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

Thirds, almost maximize and move to edge have no default shortcut. Each shortcut is a gsettings key in `org.gnome.shell.extensions.rektangel`. To change one, use `gsettings` or dconf-editor.

## Build from source

You need Node.js 22, npm, `glib-compile-schemas`, `gjs` and `zip`.

```sh
npm install
npm run build   # core with tsc, extension with esbuild, to gnome/dist/
npm test        # core unit tests and the GJS smoke test
npm run pack    # writes rektangel@repo.pet.zip
```

`gnome/install.sh` builds the extension and copies it to `~/.local/share/gnome-shell/extensions/`. Use it for development only.

## Repository layout

- `core/`: the window calculations, shared by all platforms. See `core/README.md`.
- `gnome/`: the GNOME Shell extension.
- `docs/adr/`: the architecture decisions. Read them before you change the architecture.

## License

MIT, see `LICENSE`. Rektangel ports calculations and defaults from Rectangle, Copyright (c) 2019-2026 Ryan Hanson, which is also MIT licensed.

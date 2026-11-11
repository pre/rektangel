# Rektangel

Rektangel moves and resizes windows with keyboard shortcuts on Linux. It pays tribute to [Rectangle](https://github.com/rxhanson/Rectangle) for macOS.

Design goal is to be fast and unobtrusive. This means no transition animations, no confirmations, quick reaction time, enable hammering the keys repeatedly.

<img height="750" alt="Screenshot from 2026-11-05 13-39-57" src="https://github.com/user-attachments/assets/1d35ec6b-3333-46ea-9aa0-9ea50e7f5803" />

## Install from Gnome Extension Marketplace

Rektangel will eventually be available from the Gnome Extension Marketplace.

## Install manually the release zip

Node.js is not needed at runtime as GNOME Shell runs the extension.

Installing manually:

0. Prerequisite: Install Gnome Extension Manager `apt-install gnome-shell-extension-manager`
1. Download the latest [`rektangel@repo.pet.zip` GitHub release](https://github.com/pre/rektangel/releases/latest).
2. Install Rektangel as an Gnome Extension:

   ```sh
   gnome-extensions install rektangel@repo.pet.zip
   ```

3. Log out and log in again. On Wayland, GNOME Shell loads new extensions only at login.
4. Enable the extension:

   ```sh
   gnome-extensions enable rektangel@repo.pet
   ```

## Open preference window to see the keyboard bindings

1. Open Gnome Extension Manager
2. Find User-installed Extensions > Rektangel
3. Press the settings icon to open the preferences

The bottom of the window shows the version: the release version, for example Rektangel v0.2.0, or Rektangel git-<commit> for a local build.

Opening the preference window via command line:

```sh
gnome-extensions prefs rektangel@repo.pet
```

To attach to Caps Lock, the extension writes a user XKB option to `~/.config/xkb` and adds a Rektangel option, such as `rektangel:caps_hyper_both_shifts`, to `xkb-options`. The change usually has an effect at once, at the latest after you log out and in. The Windows key keeps its GNOME function. To make the Windows key the Hyper key and get a normal Caps Lock back, select Windows key in the Hyper key group of the preferences window. See Caps Lock mode below.

## Default shortcuts

| Action           | Shortcut                 |
|------------------|--------------------------|
| Top half         | Hyper+Up                 |
| Left half        | Hyper+Left               |
| Bottom half      | Hyper+Down               |
| Right half       | Hyper+Right              |
| Top right        | Hyper+Shift+Up           |
| Top left         | Hyper+Shift+Left         |
| Bottom left      | Hyper+Shift+Down         |
| Bottom right     | Hyper+Shift+Right        |
| First third      | Hyper+1                  |
| Last third       | Hyper+2                  |
| First two thirds | Hyper+3                  |
| Last two thirds  | Hyper+4                  |
| Center third     | Hyper+5                  |
| Maximize         | Hyper+Space              |
| Almost maximize  | Hyper+Comma              |
| Maximize height  | Hyper+Return             |
| Larger           | Hyper+Plus               |
| Smaller          | Hyper+Minus              |
| Center           | Hyper+Period             |
| Top edge         | Hyper+W                  |
| Left edge        | Hyper+A                  |
| Bottom edge      | Hyper+S                  |
| Right edge       | Hyper+D                  |
| Next display     | Hyper+Apostrophe         |
| Previous display | Hyper+Shift+Apostrophe   |
| Restore previous | Hyper+Backspace          |

Hyper is the Rektangel modifier. It is Caps Lock by default, so Hyper+Left is Caps Lock+Left. The setting `super-key` makes Hyper Caps Lock or the Windows key (see Caps Lock mode). The table has the order of the preferences window, which lists the halves, the corners and the edges by their arrow or WASD key: Up, Left, Down, Right. The corners go clockwise from the arrow key: Left is top left, Up is top right, Right is bottom right and Down is bottom left. The keys are for a Finnish keyboard, on which Plus and Minus have no Shift and Apostrophe is the key to the right of Ä. On a Finnish keyboard, Shift+Apostrophe is the asterisk, so the previous display shortcut shows as Hyper+*. Mutter compares the key and the modifiers, so the stored form is `<Hyper><Shift>apostrophe`, not `<Hyper>asterisk`. On other layouts, the same key names can be on other keys, or need Shift. See ADR 0010, ADR 0012 and ADR 0014.

Each shortcut is a gsettings key in `org.gnome.shell.extensions.rektangel`. To change one, use the preferences window (see below), `gsettings` or dconf-editor. In a value, `<Hyper>` is the Rektangel modifier, `<Mod3>` is Caps Lock and `<Super>` is the Windows key. The schema is in the extension directory, so give `gsettings` the schema directory. This example sets Caps Lock+E for the first third:

```sh
schemas=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/schemas
gsettings --schemadir "$schemas" set org.gnome.shell.extensions.rektangel first-third "['<Mod3>e']"
```

### GNOME conflicts with the Windows key

GNOME shortcuts use the Windows key, which GNOME calls Super. A Hyper default conflicts with GNOME only when Hyper is the Windows key. With Caps Lock as the Hyper key, the default shortcuts do not conflict with GNOME. A shortcut that you set with the Windows key can conflict with GNOME in each mode. When Hyper is the Windows key, on GNOME 46 these GNOME defaults conflict:

| Rektangel default        | GNOME key                                                        |
|--------------------------|------------------------------------------------------------------|
| Hyper+Left, Hyper+Right  | `org.gnome.mutter.keybindings` `toggle-tiled-left`, `toggle-tiled-right` |
| Hyper+Up                 | `org.gnome.desktop.wm.keybindings` `maximize`                    |
| Hyper+Down               | `org.gnome.desktop.wm.keybindings` `unmaximize`                  |
| Hyper+Shift+arrow keys   | `org.gnome.desktop.wm.keybindings` `move-to-monitor-left`, `-right`, `-up`, `-down` |
| Hyper+Space              | `org.gnome.desktop.wm.keybindings` `switch-input-source`         |
| Hyper+Period             | `org.freedesktop.ibus.panel.emoji` `hotkey` (IBus emoji)         |
| Hyper+1 to Hyper+5       | `org.gnome.shell.keybindings` `switch-to-application-1` to `-5` (dash favorites) |
| Hyper+A                  | `org.gnome.shell.keybindings` `toggle-application-view` (show applications) |
| Hyper+S                  | `org.gnome.shell.keybindings` `toggle-quick-settings`            |
| Hyper+D                  | `org.gnome.desktop.wm.keybindings` `show-desktop` (Ubuntu only)  |

Ubuntu sets `maximize` and `unmaximize` to empty in the Ubuntu session, so on Ubuntu Windows+Up and Windows+Down are free. Ubuntu also adds Windows+D for `show-desktop`, which GNOME leaves empty. The other defaults (Hyper+Comma, Hyper+Return, Hyper+Plus, Hyper+Minus, Hyper+Apostrophe, Hyper+Shift+Apostrophe, Hyper+Backspace and Hyper+W) have no GNOME 46 shortcut. IBus is not a part of GNOME Shell, but in a window with a text input, for example GNOME Terminal, the IBus emoji hotkey gets Windows+Period before Rektangel does (see Keys with a non-ASCII character below). IBus also has Windows+Semicolon for emoji and Ctrl+Shift+U for Unicode input. Other extensions can also use these keys, for example Tiling Assistant uses Windows+Up and Windows+Down.

When Hyper is the Windows key, or when you set a shortcut with the Windows key, use `gnome-keys.sh` to remove the GNOME conflicts. The script is in the zip, and it removes only the conflicting GNOME entries. It reads the current Rektangel shortcuts, so run it again after you change a shortcut. It removes each GNOME entry that is equal to a Rektangel shortcut from these schemas: `org.gnome.desktop.wm.keybindings`, `org.gnome.mutter.keybindings`, `org.gnome.mutter.wayland.keybindings`, `org.gnome.shell.keybindings`, `org.gnome.settings-daemon.plugins.media-keys` and `org.freedesktop.ibus.panel.emoji` (IBus emoji). The script skips a schema that is not installed, for example the IBus schema on a system without IBus. The other entries of a key stay, so Windows+Semicolon stays for the IBus emoji picker. The order of the modifiers does not matter, and neither does the case of a modifier or of a one-letter key. The script needs `gsettings`, `dconf` and `jq`. It saves the old values to `~/.config/rektangel/gnome-keys-backup.json` before it changes them. A key that is in the backup from an earlier run keeps its first value. `--undo` sets the old values again, or resets a key that had the GNOME default.

```sh
dir=~/.local/share/gnome-shell/extensions/rektangel@repo.pet
bash "$dir/gnome-keys.sh" --dry-run   # show the changes
bash "$dir/gnome-keys.sh"             # do the changes
bash "$dir/gnome-keys.sh" --undo      # restore the old values
```

The script reads the Rektangel schema from the installed extension. To use another compiled schema, give `--schemadir DIR`. The script compares each Hyper shortcut as the key that `super-key` gives it: Caps Lock with `capslock` and the Windows key with `super`. No GNOME key uses Caps Lock, so the script does not compare the shortcuts with Caps Lock (`<Mod3>`). It always compares the shortcuts with the Windows key (`<Super>`). When you change `super-key` to `super`, run the script again. The conflict badges and the dialog of the preferences window use the same rule (see Caps Lock mode).

The scripts use `/usr/bin/gsettings` and `/usr/bin/dconf` when they exist. A `gsettings` from Homebrew or linuxbrew GLib often has no dconf backend. It then writes to a keyfile, and GNOME Shell does not see the change. Before a script changes a value, it compares `gsettings` with `dconf` and stops if they do not agree. When you run `gsettings` yourself, use `/usr/bin/gsettings`.

### Keys with a non-ASCII character

Do not use a key that gives a character outside ASCII, for example §, ä, ö, å or ½, or a dead key, in a shortcut with Hyper, Caps Lock or the Windows key. In a window with a text input, for example a terminal or a text field, GNOME gives each key to the IBus input method before it checks the shortcuts. The IBus simple engine, which serves the normal keyboard layouts, types a character above U+007F and starts a compose sequence for a dead key. It then reports the key as handled, and GNOME does not see the shortcut. IBus refuses a key only when Ctrl or Alt is held. The shortcut works in a window without a text input and in an X11 window, so the fault comes and goes with the focused window. IBus 1.5.29 and 1.5.30 have this fault. IBus 1.5.31 and later ignore a key with Super, so the shortcut works. Ubuntu 24.04 has IBus 1.5.29. The default shortcuts use only ASCII keys. The preferences window shows a warning on a shortcut with this problem when `ibus version` is older than 1.5.31. It does not show the warning when the version of the `libibus-1.0-5` package ends with `~localN`, where N is a number. That is the version of a local build with the two upstream fixes, for example `1.5.29-2ubuntu0~local1`. The same applies to the GNOME shortcuts, for example Windows+§ for "Switch windows of an application" on a Finnish keyboard. Use a key with an ASCII character, or add Ctrl or Alt.

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

Caps Lock mode is the default. Hyper is the name of the Rektangel modifier, and Caps Lock or the Windows key is the physical key. The setting `super-key` (`capslock`, the default, or `super`) selects the key. In Caps Lock mode, hold Caps Lock for Hyper. The Windows key keeps its GNOME function.

The Caps Lock group of the preferences window sets how you toggle caps lock in Caps Lock mode. The setting is `caps-lock-behavior`:

- Both Shift keys (`both-shifts`, the default): Caps Lock is always Hyper. Press both Shift keys at once to toggle caps lock.
- Off (`hyper-only`): Caps Lock is always Hyper. Caps lock is not available.
- Shift+Caps Lock (`shift-caps`): Shift+Caps Lock toggles caps lock. When you press Shift before Caps Lock, you get caps lock and not Hyper, and the arrow key goes to the application. This can occur when you use Hyper and Shift quickly.

Each value has its own XKB option. When the value changes, the extension replaces the option, and the change has an effect at once. See ADR 0015.

The default shortcuts are stored with `<Hyper>`, so one change of `super-key` switches all default shortcuts. A shortcut that you set in the preferences window stores the physical key that you pressed: `<Mod3>` for Caps Lock and `<Super>` for the Windows key. The window shows these keys as Caps Lock and Windows. A change of `super-key` does not change such a shortcut. After a change of `super-key`, a shortcut that you set can be the same key as a Hyper default, for example Caps Lock+1 and Hyper+1 in Caps Lock mode. The preferences window then shows a conflict. Rektangel registers the key for one of the two actions only, and writes the other action to the journal.

In v0.1.0, a stored `<Super>` was the Rektangel key. When you enable the extension the first time after the update, it changes `<Super>` to `<Hyper>` in each shortcut that you set. It does this one time, and the setting `storage-version` records it.

Rektangel registers the Hyper shortcuts with Caps Lock when the value is `capslock`. Caps Lock mode also needs a user XKB option. When `super-key` is `capslock`, the extension installs the option one time, when it is enabled or when the setting changes. The setting `xkb-option-installed` records the install, so the extension does not add the option again after the lock screen or after you removed it in Tweaks. The extension does not remove the option when it is disabled.

To switch back to the Windows key, select Windows key in the preferences window. It removes the option and sets `super-key` to `super`. Without the preferences window, run `hyper/uninstall.sh`. Caps Lock mode cannot work when `xkb-options` has another `caps:` option, for example `caps:escape`, when `xkb-options` does not have a Rektangel option, or in an X11 session, because the X server does not read user XKB rules. Then the extension writes the reason to the journal one time and registers the Hyper shortcuts with the Windows key. A shortcut that you set with Caps Lock does not work then. When you select Caps Lock, the Hyper key group of the preferences window shows the reason in red and a button that installs the option again (not on X11). When the problem is gone, the Hyper shortcuts use Caps Lock again. See `gnome/hyper/README.md`, ADR 0009, ADR 0011, ADR 0013 and ADR 0015.

## Build from source

You need Node.js >22, npm, `glib-compile-schemas`, `gjs` and `zip`.

```sh
npm install
npm run build   # core with tsc, extension with esbuild, to gnome/dist/
npm test        # unit tests, and the GJS smoke and Caps Lock tests
npm run pack    # writes rektangel@repo.pet.zip
npm run reload  # packs, installs the zip, disables and enables the extension
```

To check the Caps Lock mode XKB files offline, run `npm run test:xkb --workspace gnome`. It needs `xkbcomp`.

A local build writes `git-<commit>` to `version-name` in `dist/metadata.json`, and the release workflow writes the release version (see Publish a release). The preferences window reads the version from the installed `metadata.json`, so it shows a new install at once. GNOME Shell reads `metadata.json` at login, so the Extensions app shows the new version after the next login.

`gnome/install.sh` builds the extension and copies it to `~/.local/share/gnome-shell/extensions/`. Use it for development only. `npm run reload` installs the zip over the installed extension and then disables and enables it. The shell reads the schema again at enable, so a new default shortcut works at once. The shell keeps the extension and prefs code until the next login.

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

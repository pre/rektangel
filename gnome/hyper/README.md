# Caps Lock mode

Caps Lock mode makes Caps Lock the Rektangel key. Hold Caps Lock and press an arrow key to move a window. Super keeps its GNOME function. See ADR 0008.

The mode is optional. The default shortcuts do not need it.

## How it works

- A user XKB option, `rektangel:caps_hyper`, gives the Caps Lock key two levels: `[ Hyper_L, Caps_Lock ]` with type `TWO_LEVEL`.
- Caps Lock alone (level 1) is `Hyper_L` on the real modifier Mod3 while you hold it.
- Shift+Caps Lock (level 2) toggles caps lock. The Caps Lock LED shows the real caps lock state.
- If you press and release Caps Lock alone, it also turns caps lock off. This is the XKB `clearLocks` behavior of a modifier key.
- GNOME (Mutter) loads the option from `org.gnome.desktop.input-sources xkb-options`. libxkbcommon reads the option files from `$XDG_CONFIG_HOME/xkb` (normally `~/.config/xkb`). There is no extra process and no root step.

The bindings use `<Mod3>`, not `<Hyper>`. Mutter changes `<Hyper>` to all real modifiers that the Hyper virtual modifier maps to. With this keymap that is Lock, Mod3 and Mod4: Lock because the key also has the `Caps_Lock` symbol, and Mod4 because the standard `pc` symbols put `Hyper_L` on Mod4. Mutter ignores Lock in key events, so a `<Hyper>` binding never matches. `<Mod3>` matches only Mod3.

## Files

| File | Installed to |
|------|--------------|
| `xkb/rules/evdev` | `~/.config/xkb/rules/evdev`: includes the system rules and adds the option |
| `xkb/rules/evdev.lst` | `~/.config/xkb/rules/evdev.lst`: the option description |
| `xkb/symbols/rektangel` | `~/.config/xkb/symbols/rektangel`: the Caps Lock key |
| `install.sh` | not installed, run it from the extension directory |
| `uninstall.sh` | not installed, run it from the extension directory |

## Install and uninstall

Install the extension first. Then run the scripts from the extension directory. Both scripts run as the normal user and need `gsettings` and `jq`. Use `--dry-run` first: it shows the commands and changes nothing.

```sh
dir=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/hyper
bash "$dir/install.sh" --dry-run
bash "$dir/install.sh"
bash "$dir/uninstall.sh" --dry-run
bash "$dir/uninstall.sh"
```

`install.sh` does these steps:

1. It saves the current Rektangel bindings to `~/.config/rektangel/hyper-backup.json`.
2. It copies the three XKB files to `~/.config/xkb`. It stops if a file with other content is already there, because then you have your own XKB configuration. Merge the files by hand in that case.
3. It adds `rektangel:caps_hyper` to `xkb-options`. It keeps the other options. It stops if a `caps:` option is already set, because two options for one key conflict.
4. It sets the Rektangel bindings in the table below.

`uninstall.sh` writes back the saved bindings, or resets a binding that had the default, removes `rektangel:caps_hyper` from `xkb-options` (other options stay), and removes the XKB files if they are not changed.

## Bindings in Caps Lock mode

Caps Lock replaces Super, and also the Alt or Ctrl+Alt that the default shortcuts need only to prevent conflicts with GNOME.

| Action           | Default                  | Caps Lock mode         | gsettings value                |
|------------------|--------------------------|------------------------|--------------------------------|
| Left half        | Super+Alt+Left           | Caps+Left              | `<Mod3>Left`                   |
| Right half       | Super+Alt+Right          | Caps+Right             | `<Mod3>Right`                  |
| Top half         | Super+Alt+Up             | Caps+Up                | `<Mod3>Up`                     |
| Bottom half      | Super+Alt+Down           | Caps+Down              | `<Mod3>Down`                   |
| Maximize         | Super+Alt+F              | Caps+F                 | `<Mod3>f`                      |
| Center           | Super+Alt+C              | Caps+C                 | `<Mod3>c`                      |
| Maximize height  | Ctrl+Alt+Shift+Up        | Caps+Shift+Up          | `<Mod3><Shift>Up`              |
| Larger           | Ctrl+Alt+Shift+Right     | Caps+Shift+Right       | `<Mod3><Shift>Right`           |
| Smaller          | Ctrl+Alt+Shift+Left      | Caps+Shift+Left        | `<Mod3><Shift>Left`            |
| Previous display | Ctrl+Alt+Super+Left      | Caps+Alt+Left          | `<Mod3><Alt>Left`              |
| Next display     | Ctrl+Alt+Super+Right     | Caps+Alt+Right         | `<Mod3><Alt>Right`             |
| Top left         | Ctrl+Super+Left          | Caps+Ctrl+Left         | `<Mod3><Control>Left`          |
| Top right        | Ctrl+Super+Right         | Caps+Ctrl+Right        | `<Mod3><Control>Right`         |
| Bottom left      | Ctrl+Shift+Super+Left    | Caps+Ctrl+Shift+Left   | `<Mod3><Control><Shift>Left`   |
| Bottom right     | Ctrl+Shift+Super+Right   | Caps+Ctrl+Shift+Right  | `<Mod3><Control><Shift>Right`  |
| Restore          | Ctrl+Alt+BackSpace       | Caps+BackSpace         | `<Mod3>BackSpace`              |

Thirds, almost maximize and move to edge have no default shortcut, so `install.sh` does not change them. To give one a Caps Lock shortcut, set it with `gsettings`, for example `['<Mod3>e']`.

## Known limits

- Caps Lock has no tap function, except that a tap turns caps lock off.
- While you hold Caps Lock, the Lock modifier is also active. Letters that you type with Caps Lock held come out in upper case. Rektangel shortcuts are not affected.
- The standard `pc` symbols also put the level 5 shift on Mod3. Layouts that use level 5 (for example with the `lv5:` options) do not work well together with this mode.
- A GNOME or libxkbcommon upgrade can change how user XKB files are read.
- If the two-level key does not work, use the stock option `shift:both_capslock_cancel` for caps lock instead: both Shift keys together turn caps lock on, and one Shift key turns it off.

## Check the XKB files offline

`npm run test:xkb --workspace gnome` compiles a keymap with `xkbcomp` and checks the Caps Lock key. It does not change the keymap of the session.

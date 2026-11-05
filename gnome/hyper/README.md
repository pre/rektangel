# Caps Lock mode

Caps Lock mode makes Caps Lock the Super key of the Rektangel shortcuts. Hold Caps Lock instead of Super: Super+Left becomes Caps+Left. Super keeps its GNOME function. See ADR 0008, ADR 0009 and ADR 0011.

The mode is the default. When `super-key` is `capslock`, the extension installs the XKB option itself when it is enabled, and the preferences window installs it when you select Caps Lock. You do not need the scripts in this directory for the default.

## How it works

- The shortcuts are always stored with `<Super>`. The setting `super-key` tells Rektangel which key that is: `capslock` (the default) or `super`.
- With `capslock`, Rektangel registers each stored shortcut with `<Mod3>` in place of `<Super>`. The stored values do not change. When you set `super-key` back to `super`, the Super shortcuts work again, and you do not edit a shortcut.
- A user XKB option, `rektangel:caps_hyper`, gives the Caps Lock key two levels: `[ Hyper_L, Caps_Lock ]` with type `TWO_LEVEL`.
- Caps Lock alone (level 1) is `Hyper_L` on the real modifier Mod3 while you hold it.
- Shift+Caps Lock (level 2) toggles caps lock. The Caps Lock LED shows the real caps lock state.
- If you press and release Caps Lock alone, it also turns caps lock off. This is the XKB `clearLocks` behavior of a modifier key.
- GNOME (Mutter) loads the option from `org.gnome.desktop.input-sources xkb-options`. libxkbcommon reads the option files from `$XDG_CONFIG_HOME/xkb` (normally `~/.config/xkb`). There is no extra process and no root step.

Rektangel registers `<Mod3>`, not `<Hyper>`. Mutter changes `<Hyper>` to all real modifiers that the Hyper virtual modifier maps to. With this keymap that is Lock, Mod3 and Mod4: Lock because the key also has the `Caps_Lock` symbol, and Mod4 because the standard `pc` symbols put `Hyper_L` on Mod4. Mutter ignores Lock in key events, so a `<Hyper>` binding never matches. `<Mod3>` matches only Mod3.

## Files

| File | Installed to |
|------|--------------|
| `xkb/rules/evdev` | `~/.config/xkb/rules/evdev`: includes the system rules and adds the option |
| `xkb/rules/evdev.lst` | `~/.config/xkb/rules/evdev.lst`: the option description |
| `xkb/symbols/rektangel` | `~/.config/xkb/symbols/rektangel`: the Caps Lock key |
| `capslock-mode.js` | not installed: the XKB step, run with `gjs` by the scripts |
| `install.sh` | not installed, run it from the extension directory |
| `uninstall.sh` | not installed, run it from the extension directory |

If `~/.config/xkb/rules/evdev` or `evdev.lst` exists already, the XKB step does not replace it. It adds the Rektangel lines at the end, if they are not there. The install always writes `symbols/rektangel`. The remove step removes `symbols/rektangel` and each line that has the word `rektangel`, also the lines of an older version. It removes a rules file when no other rule stays in it. The directories stay.

## Install and uninstall

The extension and the preferences window do the same steps as these scripts. Use `uninstall.sh` to get a normal Caps Lock back without the preferences window. Use `install.sh` only if you selected the Windows key before and want Caps Lock again without the preferences window. `uninstall.sh` also sets `super-key` to `super`. If `super-key` stays `capslock`, the extension installs the option again at the next enable.

Install the extension first. Then run the scripts from the extension directory. Both scripts run as the normal user and need `gsettings`, `dconf` and `gjs`. Use `--dry-run` first: it shows the changes and changes nothing.

The scripts use `/usr/bin/gsettings`, `/usr/bin/dconf` and `/usr/bin/gjs` when they exist. A `gsettings` from Homebrew or linuxbrew GLib often has no dconf backend. It then writes to a keyfile, and GNOME Shell does not see the change. Before a script changes a value, it compares `gsettings` with `dconf` and stops if they do not agree.

```sh
dir=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/hyper
bash "$dir/install.sh" --dry-run
bash "$dir/install.sh"
bash "$dir/uninstall.sh" --dry-run
bash "$dir/uninstall.sh"
```

`install.sh` does these steps:

1. It copies the three XKB files to `~/.config/xkb`, or adds the Rektangel lines to the user files that are there.
2. It adds `rektangel:caps_hyper` to `xkb-options`. It keeps the other options. It stops before step 1 if a `caps:` option is set, because two options for one key conflict.
3. It sets `super-key` to `capslock`.

`uninstall.sh` sets `super-key` to `super`, removes `rektangel:caps_hyper` from `xkb-options` (other options stay), and removes the Rektangel XKB files and lines. You can run each script again: a step that is done already does nothing.

To change only the Rektangel side, set the key yourself:

```sh
schemas=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/schemas
/usr/bin/gsettings --schemadir "$schemas" set org.gnome.shell.extensions.rektangel super-key capslock
```

When `super-key` changes to `capslock`, the extension installs the XKB option if it is not there. Without the XKB option, Caps Lock does not set Mod3, so the shortcuts then do not work.

## Shortcuts in Caps Lock mode

Each shortcut is the stored shortcut with Caps Lock in place of Super. A shortcut without Super does not change. With the defaults:

| Action           | Default                  | Caps Lock mode           |
|------------------|--------------------------|--------------------------|
| Left half        | Super+Left               | Caps+Left                |
| Top left         | Super+Shift+Left         | Caps+Shift+Left          |
| Maximize         | Super+Space              | Caps+Space               |
| Restore          | Super+BackSpace          | Caps+BackSpace           |

All defaults use Super, so in Caps Lock mode all defaults use Caps Lock, and Super is free for GNOME. In Caps Lock mode you do not need `gnome-keys.sh`. But `gnome-keys.sh` compares the stored form, so if you run it, it removes the GNOME Super+Left (tile the window to the left) and the other conflicts also in Caps Lock mode. Then you need no new run when you set `super-key` to `super`. To get the GNOME shortcuts back in Caps Lock mode, run `gnome-keys.sh --undo`.

## Known limits

- Caps Lock has no tap function, except that a tap turns caps lock off.
- While you hold Caps Lock, the Lock modifier is also active. Letters that you type with Caps Lock held come out in upper case. Rektangel shortcuts are not affected.
- The standard `pc` symbols also put the level 5 shift on Mod3. Layouts that use level 5 (for example with the `lv5:` options) do not work well together with this mode.
- A GNOME or libxkbcommon upgrade can change how user XKB files are read.
- If the two-level key does not work, use the stock option `shift:both_capslock_cancel` for caps lock instead: both Shift keys together turn caps lock on, and one Shift key turns it off.

## Check the XKB files offline

`npm run test:xkb --workspace gnome` compiles a keymap with `xkbcomp` and checks the Caps Lock key. It does not change the keymap of the session.

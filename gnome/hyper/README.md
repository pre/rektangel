# Caps Lock mode

Caps Lock mode makes Caps Lock the Hyper key. Hyper is the modifier of the Rektangel default shortcuts. Hold Caps Lock for Hyper: Hyper+Left is Caps+Left. The Windows key keeps its GNOME function. See ADR 0008, ADR 0009, ADR 0011, ADR 0013 and ADR 0015.

The mode is the default. When `super-key` is `capslock`, the extension installs the XKB option itself one time, when it is enabled, and the preferences window installs it when you select Caps Lock. The setting `xkb-option-installed` records the install, so the extension does not add the option again after the lock screen or after you removed it in Tweaks. You do not need the scripts in this directory for the default.

## How it works

- The default shortcuts are stored with `<Hyper>`. The setting `super-key` tells Rektangel which physical key Hyper is: `capslock` (the default) or `super` (the Windows key).
- With `capslock`, Rektangel registers each `<Hyper>` shortcut with `<Mod3>`. With `super`, it registers them with `<Super>`. The stored values do not change. When you change `super-key`, the Hyper shortcuts move to the other key, and you do not edit a shortcut.
- A shortcut that you set in the preferences window stores the key that you pressed: `<Mod3>` for Caps Lock and `<Super>` for the Windows key. A change of `super-key` does not move it.
- A user XKB option makes Caps Lock `Hyper_L` on the real modifier Mod3 while you hold it. The setting `caps-lock-behavior` selects the option (ADR 0015):

  | `caps-lock-behavior` | XKB option | Caps lock |
  |----------------------|------------|-----------|
  | `both-shifts` (default) | `rektangel:caps_hyper_both_shifts` | Both Shift keys together. Caps Lock is `ONE_LEVEL` `[ Hyper_L ]`, with the stock `shift(both_capslock)`. |
  | `hyper-only` | `rektangel:caps_hyper_only` | Not available. Caps Lock is `ONE_LEVEL` `[ Hyper_L ]`. |
  | `shift-caps` | `rektangel:caps_hyper` | Shift+Caps Lock. Caps Lock is `TWO_LEVEL` `[ Hyper_L, Caps_Lock ]`. XKB selects the level when the key goes down, so Caps Lock pressed after Shift gives caps lock and not Hyper. |

- The Caps Lock LED shows the real caps lock state.
- When `caps-lock-behavior` changes, the extension replaces the option. Mutter then loads the keymap again, so the change has an effect at once.
- If you press and release Caps Lock alone, it also turns caps lock off. This is the XKB `clearLocks` behavior of a modifier key.
- GNOME (Mutter) loads the option from `org.gnome.desktop.input-sources xkb-options`. libxkbcommon reads the option files from `$XDG_CONFIG_HOME/xkb` (normally `~/.config/xkb`). There is no extra process and no root step.

In the stored shortcuts, Hyper is only a Rektangel name. Rektangel registers `<Mod3>`, not `<Hyper>`. Mutter changes `<Hyper>` to all real modifiers that the Hyper virtual modifier maps to. With this keymap that is Lock, Mod3 and Mod4: Lock because the key also has the `Caps_Lock` symbol, and Mod4 because the standard `pc` symbols put `Hyper_L` on Mod4. Mutter ignores Lock in key events, so a `<Hyper>` binding never matches. `<Mod3>` matches only Mod3.

## Files

| File | Installed to |
|------|--------------|
| `xkb/rules/evdev` | `~/.config/xkb/rules/evdev`: includes the system rules and adds the options |
| `xkb/rules/evdev.lst` | `~/.config/xkb/rules/evdev.lst`: the option descriptions |
| `xkb/symbols/rektangel` | `~/.config/xkb/symbols/rektangel`: the Caps Lock key, one variant for each behavior |
| `capslock-mode.js` | not installed: the XKB step, run with `gjs` by the scripts |
| `install.sh` | not installed, run it from the extension directory |
| `uninstall.sh` | not installed, run it from the extension directory |

If `~/.config/xkb/rules/evdev` or `evdev.lst` exists already, the XKB step does not replace it. It adds the Rektangel lines at the end, if they are not there, and removes the Rektangel lines of an older version first. The install always writes `symbols/rektangel`. The remove step removes `symbols/rektangel` and each line that has the word `rektangel`, also the lines of an older version. It removes a rules file when no other rule stays in it. The directories stay.

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
2. It adds the option of `caps-lock-behavior` to `xkb-options`, in place of another Rektangel option. It keeps the other options. It stops before step 1 if a `caps:` option is set, because two options for one key conflict.
3. It sets `xkb-option-installed` to `true` and `super-key` to `capslock`.

`uninstall.sh` sets `super-key` to `super`, removes the Rektangel options from `xkb-options` (other options stay), removes the Rektangel XKB files and lines, and sets `xkb-option-installed` to `false`. You can run each script again: a step that is done already does nothing.

To change only the Rektangel side, set the key yourself:

```sh
schemas=~/.local/share/gnome-shell/extensions/rektangel@repo.pet/schemas
/usr/bin/gsettings --schemadir "$schemas" set org.gnome.shell.extensions.rektangel super-key capslock
```

When `super-key` changes to `capslock`, the extension installs the XKB option one time, if it is not there. Without the XKB option, Caps Lock does not set Mod3. Then the extension registers the Hyper shortcuts with the Windows key, and a shortcut that you set with Caps Lock does not work.

## Shortcuts in Caps Lock mode

Each Hyper shortcut uses Caps Lock. A shortcut with the Windows key or without Hyper does not change. With the defaults:

| Action           | Default                  | Caps Lock mode           |
|------------------|--------------------------|--------------------------|
| Left half        | Hyper+Left               | Caps+Left                |
| Top left         | Hyper+Shift+Left         | Caps+Shift+Left          |
| Maximize         | Hyper+Space              | Caps+Space               |
| Restore          | Hyper+BackSpace          | Caps+BackSpace           |

All defaults use Hyper, so in Caps Lock mode all defaults use Caps Lock, and the Windows key is free for GNOME. In Caps Lock mode you need `gnome-keys.sh` only for the shortcuts that you set with the Windows key. The script compares each Hyper shortcut as the key that `super-key` gives it, and it does not compare the shortcuts with Caps Lock. When you set `super-key` to `super`, run `gnome-keys.sh` again. To get the GNOME shortcuts back, run `gnome-keys.sh --undo`.

## Known limits

- Caps Lock has no tap function, except that a tap turns caps lock off.
- While you hold Caps Lock, the Lock modifier is also active. Letters that you type with Caps Lock held come out in upper case. Rektangel shortcuts are not affected.
- The standard `pc` symbols also put the level 5 shift on Mod3. Layouts that use level 5 (for example with the `lv5:` options) do not work well together with this mode.
- A GNOME or libxkbcommon upgrade can change how user XKB files are read.

## Check the XKB files offline

`npm run test:xkb --workspace gnome` compiles a keymap with `xkbcomp` for each variant and checks the Caps Lock and Shift keys. It does not change the keymap of the session.

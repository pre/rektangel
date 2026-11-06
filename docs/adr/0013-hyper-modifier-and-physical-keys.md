# Hyper is the Rektangel modifier, and Super and Mod3 are the physical keys

Status: accepted. Supersedes ADR-0009 for the storage form. The translation of ADR-0009 stays.

In ADR 0009, a stored `<Super>` was the Rektangel key, and `super-key` made it Caps Lock or the Windows key. That storage cannot hold a shortcut for the Windows key while Caps Lock is the Rektangel key: Windows+U and Caps Lock+U both became `<Super>u`, and the preferences window showed "Super" for both. GNOME calls the Windows key Super, so the name was also confusing.

The shortcuts now use three modifier tokens:

| Token | Meaning | Label in the window | Mutter gets |
|---|---|---|---|
| `<Hyper>` | The Rektangel modifier. `super-key` makes it Caps Lock or the Windows key. | Hyper | `<Mod3>` (`capslock`) or `<Super>` (`super`) |
| `<Super>` | The physical Windows key, the same meaning as in GNOME. `<Mod4>` is an alias. | Windows | `<Super>` |
| `<Mod3>` | The physical Caps Lock, the modifier of the XKB option of ADR 0008. | Caps Lock | `<Mod3>` |

Hyper is only a Rektangel name. Mutter never gets `<Hyper>`. The extension gives Mutter a translated copy of the shortcuts in a memory settings backend, as in ADR 0009. `translateHyper` changes `<Hyper>` to `<Mod3>` or `<Super>`, and does not change `<Super>` and `<Mod3>`.

The schema defaults use `<Hyper>`. The capture dialog of the preferences window stores the physical key that the user pressed, so a shortcut that the user sets has `<Super>` or `<Mod3>`, not `<Hyper>`. The dialog follows the key values `Super_L` and `Super_R` for the Windows key and `Hyper_L` for Caps Lock, because GTK does not name the Super and Hyper modifier masks reliably: one Caps Lock press gave `<Super><Hyper>`. It takes only Shift, Ctrl and Alt from the GTK mask. A press with Caps Lock and the Windows key together is refused.

The gsettings key keeps the name `super-key` and the values `super` and `capslock`. Its summary is "Hyper key". The preferences window group is "Hyper key", with the choices "Windows key" and "Caps Lock".

## Considered Options

- Keep `<Super>` as the abstract name of the Rektangel key: the storage cannot hold a Windows key shortcut in Caps Lock mode, and the label "Super" has two meanings.
- Store the Caps Lock shortcuts as `<Hyper>` and give them to Mutter without a change: ADR 0009 found that Mutter expands `<Hyper>` to Lock, Mod3 and Mod4. Mutter removes Lock from key events, so the binding never matches.
- Store the physical Caps Lock with a new token: a value that the user types with `gsettings` then needs a translation table. `<Mod3>` is a modifier name that Mutter and GTK know.
- Rename `super-key` to `hyper-key`: v0.1.0 is released, and a rename needs a migration of the choice. The rename was not done. It is an open question.

## Consequences

- A change of `super-key` moves only the `<Hyper>` shortcuts. ADR 0009 said that one change switches all shortcuts. That is now true for the defaults and for other `<Hyper>` values. A shortcut that the user captured keeps its physical key.
- After a change of `super-key`, a user `<Mod3>` shortcut and a default `<Hyper>` shortcut can be the same key, for example `<Mod3>1` and `<Hyper>1` with `capslock`. The same is true for a user `<Super>` shortcut and `super`. The preferences window shows the Rektangel conflict badge. Mutter cannot grab one key for two keybindings, so the extension gives the key to the key that is first in `allActions` order, and leaves it out of the copy of the later key. A default on an earlier key wins over a user value on a later key. The extension writes one journal line, one time for each line while it is enabled:

  ```
  Rektangel: <key> and <other key> are both <accelerator>, <key> is not registered
  ```

  A change of a stored shortcut copies all keys again, so the later key gets its shortcut back when the other key releases it.
- In v0.1.0, a stored `<Super>` meant the Rektangel key. At enable, when the new key `storage-version` is 0, the extension changes `<Super>` to `<Hyper>` in each user-set keybinding key, then sets `storage-version` to 1. It also sets the version when no key is user-set. The migration runs only when `storage-version` is 0, so it runs one time, and a Windows key shortcut that the user sets after the migration stays `<Super>`. A value of `<Super>` that a script writes with `gsettings` is now the Windows key.
- All comparisons use the effective form: `<Hyper>` translated with `super-key`, then normalized. This applies between two Rektangel shortcuts and between a Rektangel shortcut and a GNOME shortcut. No GNOME key uses Mod3, so a shortcut that Mutter grabs with Caps Lock cannot conflict with GNOME. A `<Hyper>` default can conflict with GNOME only when `super-key` is `super`. A `<Super>` shortcut can always conflict. The preferences window shows a GNOME conflict of a Hyper default with the label "Windows".
- `gnome-keys.sh` resolves `<Hyper>` with the current `super-key` before it compares, and it leaves out the shortcuts with `<Mod3>`. ADR 0009 said that a change of `super-key` needs no new run of the script. This is not true now: after a change to `super`, run `gnome-keys.sh` again.
- When Caps Lock mode cannot work (ADR 0011), the extension registers the `<Hyper>` shortcuts with the Windows key. A user `<Mod3>` shortcut then does not work, because no key sets Mod3.
- The label of the Windows key is "Windows", not the GNOME name "Super". This is an open question.

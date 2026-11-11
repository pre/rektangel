# Make gsd-media-keys apply a change of a `-static` key

Status: accepted. Changes the grab after a GNOME change of ADR 0017.

gsd-media-keys reads two keys of `org.gnome.settings-daemon.plugins.media-keys` for one shortcut: `<name>`, which GNOME Settings shows, and `<name>-static`, which it does not show. GNOME 46 has 43 `-static` keys. The `changed` handler of gsd-media-keys compares the changed key with `<name>` only. Thus a change of `<name>-static` has no effect until gsd-media-keys starts again, usually at the next login. The upstream main branch has the same code (2026-11-11).

Example: `rotate-video-lock-static` has `<Super>o`. After "Remove from GNOME", gsd-media-keys keeps Super+O, and an app entry with Super+O does not get the key.

## Decision

- When a `-static` key changes, the extension writes `<name>` two times and keeps its value. When `<name>` has no user value, the extension sets the current value and then resets the key. Else it resets the key and then sets the old value. Each write adds or removes the user value, so dconf reports both writes as a change, also when the value is the default. gsd-media-keys then reads both keys again.
- GNOME Shell does the writes, not the preferences window. Thus they also follow a change by `gnome-keys.sh`, `gnome-keys.sh --undo`, dconf-editor or any other program.
- After a change of a GNOME keybinding schema or of a custom shortcut, the extension grabs the entries again 1 s after the last change, not in an idle callback. gsd-media-keys releases a shortcut after a 50 ms timer and a D-Bus call to GNOME Shell, so the idle grab came before the release. A change of a Rektangel setting still grabs in the idle callback of ADR 0017.

## Considered Options

- A button in the preferences window that restarts gsd-media-keys (`systemctl --user restart org.gnome.SettingsDaemon.MediaKeys.target`, because the service refuses a manual restart). GNOME Shell then releases all shortcuts of gsd-media-keys, but no setting changes, so the extension does not grab again. All media keys and custom shortcuts also stop for a moment.
- A warning in the preferences window that the change has an effect after the next login. The user must log out.
- Do the writes in the preferences window after "Remove from GNOME". `gnome-keys.sh` then needs the same code in bash, for the removal and for `--undo`.
- Grab in the idle callback, and again later when a grab fails. Each GNOME change then gives two grabs and a wrong journal line.

## Consequences

- While the extension is enabled, it writes a key of gnome-settings-daemon when a program changes a `-static` key. The value of the key stays the same.
- When the extension is disabled, a change of a `-static` key has an effect at the next login, as before.
- An app entry gets a shortcut that GNOME releases about 1 s after the change.
- When `<name>` has the default `['']`, gsd-media-keys writes "Failed to grab accelerator for keybinding settings:`<name>`" to the journal after the writes. It writes the same line at login, because an empty string is not a shortcut.
- Remove this workaround when gnome-settings-daemon applies a change of a `-static` key.

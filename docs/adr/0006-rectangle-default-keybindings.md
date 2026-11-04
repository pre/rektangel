# Default keybindings are Rectangle defaults, and only conflicting GNOME entries are removed

Status: superseded by ADR-0010

The default keybindings are the Rectangle defaults with cmd translated to Super, alt to Alt and ctrl to Ctrl, so that Rectangle users keep their muscle memory. Some of these keys are also GNOME defaults, so `gnome-keys.sh` removes only the conflicting entries from the GNOME arrays, keeps the other entries, and saves the old values so that `--undo` can restore them.

# Keybindings live in gsettings, other settings in config.toml

GNOME Shell grabs global keys only for keybindings that it reads from a gsettings schema, so each action has one gsettings key. The other settings (cycle sizes, step size, corner axis) live in `~/.config/rektangel/config.toml`, which is easy to read, edit and copy between machines.

# The cycle sizes are a gsettings key with fixed choices

Status: accepted. Changes ADR 0007 for the cycle sizes. The other settings stay in `config.toml`.

In ADR 0007, the cycle sizes are `cycle_sizes` in `~/.config/rektangel/config.toml`, a list of any fractions. The preferences window cannot show that file, and a change has an effect only after the extension is enabled again.

## Decision

- The cycle sizes are the gsettings key `cycle-sizes`, type `as`. The choices are `1/4`, `1/3`, `2/3` and `3/4`, and the default is `['1/3', '2/3']`, the earlier default.
- 1/2 is not in the key. The extension always adds it, because the first press always gives 1/2 and the cycle must come back to it.
- The preferences window has one check button for each size, as Rectangle has. The extension follows a change of the key at once.
- `config.toml` does not accept `cycle_sizes`. A file with it is an error, and the error tells the user to use the preferences window.

## Considered Options

- Keep `cycle_sizes` in `config.toml` and let it override the key: two places for one setting, and the window can show a value that is not in use.
- A list of any fractions in gsettings (`ad`): the window cannot show it as check buttons, and few users need other sizes.
- A dropdown with fixed sets, for example thirds or quarters: it gives fewer combinations than the check buttons and is not simpler to use.

## Consequences

- A `config.toml` with `cycle_sizes` from an earlier version makes Rektangel use the defaults for all keys of the file until the user removes the line.
- Other sizes than the four choices are not possible.
- `gnome-keys.sh` and the schema test skip `cycle-sizes`, because it is a list of strings that are not shortcuts.

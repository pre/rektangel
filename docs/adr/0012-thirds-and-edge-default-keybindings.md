# Thirds and move to edge use Super with one key as the defaults

Status: accepted. Extends ADR-0010.

The thirds have default keybindings with the digits: Super+1 first third, Super+2 last third, Super+3 first two thirds, Super+4 last two thirds, Super+5 center third. Move to edge has default keybindings with the letters W, A, S and D: Super+W top edge, Super+A left edge, Super+S bottom edge, Super+D right edge. The Thirds and Move groups of the preferences window list the actions in these orders. The Halves and Corners groups list the actions by their arrow key in the same Up, Left, Down, Right order as the WASD keys, and the Displays group lists next display before previous display. Almost maximize keeps no default.

ADR 0010 gave these actions no default, because the one-key Super shortcuts that fit the arrow key pattern were used. The digits are the next free set of one-key Super shortcuts. The order from one third to two thirds, with the center last, gives the actions that cycle through the positions the low digits. W, A, S and D are the direction keys of games, so the edge of each key is known without a table.

## Considered Options

- Keep the actions without a default: the user sets nine shortcuts by hand before they work.
- Super+Shift with a digit or a letter: it needs two modifiers, which ADR 0010 avoids.
- Super+Alt with an arrow key for the edges: two modifiers, and on GNOME Super+Alt+arrow switches the workspace.

## Consequences

- With the Windows key as Super, Super+1 to Super+5 are the GNOME shortcuts `switch-to-application-1` to `-5` of `org.gnome.shell.keybindings`, which activate the dash favorites. Super+A is `toggle-application-view` and Super+S is `toggle-quick-settings` in the same schema. On Ubuntu, Super+D is `show-desktop`. `gnome-keys.sh` removes them. In Caps Lock mode (ADR 0011) there is no conflict.
- The schema has 25 default accelerators, and the test that no two defaults use the same accelerator counts them.
- A user who set one of these actions to a shortcut keeps the value. A user who bound Super+digit or Super+W, A, S or D to another action gets two actions on the same key until one is changed (see ADR 0010).

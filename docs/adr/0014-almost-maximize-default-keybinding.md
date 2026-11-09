# Almost maximize uses Hyper+Comma as the default

Status: accepted. Extends ADR-0012.

Almost maximize has the default keybinding Hyper+Comma, stored as `<Hyper>comma`. ADR 0010 and ADR 0012 gave this action no default. Comma is next to Period, which is the default of center. Both actions center the window, and almost maximize also sets the size to 90 percent of the work area. The Maximize group of the preferences window lists almost maximize after maximize, as before.

## Considered Options

- Keep the action without a default: the user sets the shortcut by hand before it works. The other actions all have a default since ADR 0012.
- Hyper+Shift+Space, next to maximize: it needs two modifiers, which ADR 0010 avoids for the one-key actions.
- A letter, for example Hyper+M: M is not next to a related key. W, A, S and D are taken by the edges.

## Consequences

- No GNOME 46 shortcut uses the Windows key with Comma, so the default has no GNOME conflict in Caps Lock mode or with the Windows key, and `gnome-keys.sh` has nothing to remove for it.
- The schema has 26 default accelerators, and the test that no two defaults use the same accelerator counts them.
- A user who set almost maximize to a shortcut keeps the value. A user who bound Hyper+Comma to another action gets two actions on the same key until one is changed. The extension registers the key for the first action in `allActions` order and writes the other to the journal (ADR 0013).

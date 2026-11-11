# The preferences window warns when IBus can take a shortcut with a non-ASCII key

Status: accepted. ADR 0017 extends the first condition to keys without a modifier and to keys with Shift only.

A shortcut can use a key that gives a character outside ASCII, for example §, ä, ö, å or ½, or a dead key. Some IBus versions take such a shortcut in a window with a text input. The preferences window shows a warning on the shortcut only when the installed IBus has this fault.

## The fault

In a window with a text input, for example a terminal or a text field, GNOME gives each key to the IBus input method before it checks the shortcuts. The IBus simple engine serves the normal keyboard layouts. It types a character above U+007F and starts a compose sequence for a dead key. It then reports the key as handled, and GNOME does not see the shortcut. IBus refuses a key only when Ctrl or Alt is held. It does not refuse the Windows key (Super) or Caps Lock (Mod3), and Hyper is one of them. The shortcut works in a window without a text input and in an X11 window, so the fault comes and goes with the focused window. The same fault applies to the GNOME shortcuts, for example Windows+§ for "Switch windows of an application" on a Finnish keyboard.

Two upstream commits fix the fault:

| Commit | IBus release | Change |
|--------|--------------|--------|
| `4872c1fcd` | 1.5.30 | The simple engine does not type the character. |
| `48c4a9c90` | 1.5.31 | The simple engine ignores Super for compose keys, as it ignores Alt and Ctrl. |

Ubuntu 24.04 LTS has IBus 1.5.29-2, with the fault. Ubuntu 26.04 LTS has IBus 1.5.34, with the fix. [ibus-super-fix](https://github.com/pre/linux-tilkku/tree/main/ibus-super-fix) builds the Ubuntu 24.04 package again with the two commits. Its version is `1.5.29-2ubuntu0~local1`.

## Decision

The preferences window shows the warning badge on a shortcut when all of these are true:

- The shortcut has Hyper, Super or Mod3, and neither Ctrl nor Alt.
- The key is a dead key, or its character is above U+007F.
- `ibus version` gives a version older than 1.5.31.
- The version of the `libibus-1.0-5` package, from `dpkg-query`, does not end with `~localN`, where N is a number.

Without IBus there is no warning. Without dpkg, the IBus version alone decides.

## Considered Options

- Warn on each such shortcut, without a version check: the warning stays after the user installs the fix.
- Check only the IBus version: a local build with the fix has the same upstream version, 1.5.29, as the package with the fault.
- Check the IBus version and the package version: chosen. Only Debian and Ubuntu have dpkg, and only the `~localN` form is known to have the fix.

## Consequences

- The default shortcuts use only ASCII keys, so the warning shows only for a shortcut that the user sets.
- An official Ubuntu update with the fix, for example `1.5.29-2ubuntu0.1`, gets the warning until Rektangel knows its version.
- The preferences window runs `ibus version` and `dpkg-query` one time when it opens.

# Limitations

This file records the known limitations of Rektangel. A limitation is a behavior that looks like a fault to the user and that Rektangel does not correct. Each entry gives the symptom, the cause, what you can do and the corrections that were considered.

## GNOME Terminal does not fill its part of the screen

GNOME Terminal makes its window smaller than the frame that Rektangel calculates. An empty strip stays below the window and on its right side. With one window on the left half and one window on the right half, the strip on the right side of the left window shows as a gap between the two windows.

Each strip is smaller than one character cell. Its size changes with the size of the work area, so each monitor shows a different gap. A window without a size increment, for example a browser, fills the frame.

### Cause

GNOME Terminal gives GTK 3 a size increment of one character cell. GTK 3 then makes a floating window smaller until the text area holds a whole number of columns and rows. The window keeps its top left corner.

Rektangel sets the frame with one `move_resize_frame` call, and the window stays a floating window (ADR 0004). GTK 3 ignores the size increment only for a maximized, fullscreen or tiled window. See `should_use_fixed_size` in `gdk/wayland/gdkwindow-wayland.c` on the GTK branch `gtk-3-24`. Thus the GNOME action "View split on left" fills the half, and the Rektangel action "left half" does not.

Other GTK 3 applications that set a size increment can show the same strips.

### Example

Measured on 2026-11-13 with GNOME Shell 46 on Wayland, GNOME Terminal 3.52, GTK 3.24.41 and a cell of 9 x 20 pixels. All sizes are logical pixels. The columns and rows are measured. The strips are calculated from them.

| Monitor scale | Half of the work area | Columns x rows | Strip on the right side | Strip below |
| ------------- | --------------------- | -------------- | ----------------------- | ----------- |
| 1.75          | 824 x 1030            | 90 x 49        | 0                       | 1           |
| 1.5           | 1280 x 1408           | 140 x 67       | 6                       | 19          |
| 1.25          | 1536 x 1728           | 169 x 83       | 1                       | 19          |

The monitor scale has no direct effect. It changes the size of the work area in logical pixels, and the work area sets how many pixels stay after the last full column and row.

### What you can do

- Use the GNOME actions "View split on left" and "View split on right" for a terminal window. GNOME sets the tiled state, and GTK 3 then ignores the size increment.
- Use a terminal that sets no size increment. GTK 4 has no size increment for a window, so a GTK 4 terminal, for example Ptyxis or GNOME Console, cannot set one. This is not tested with Rektangel.

### Considered corrections

No correction is implemented.

- Set the GNOME maximized state: vertical for an action that uses the full height, horizontal for an action that uses the full width, both for maximize. Mutter then reports tiled edges to the application. This is not tested. It reverses ADR 0004: GNOME animates the change, and the next action needs an unmaximize step first. It does not help the corners and the other frames that are smaller than the work area in both directions.
- Move the window after the application sets its size, so that each strip is at an edge of the monitor. The two windows then touch, but the strip below the window stays.

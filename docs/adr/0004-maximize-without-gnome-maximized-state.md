---
Status: proposed
---

# Maximize sets the frame to the work area, not the GNOME maximized state

Maximize works as in Rectangle: the window frame becomes the work area, and the window does not enter the GNOME maximized state. This keeps every action one synchronous `move_resize_frame` with no animation and no unmaximize step before the next move. Revisit after daily use: real GNOME maximize gives applications their maximized layout, but it animates and needs an unmaximize before any move.

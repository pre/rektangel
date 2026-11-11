# Show or hide app windows with grab_accelerator and minimize

Status: accepted. Extends ADR 0016 for keys without a modifier.

A global shortcut shows or hides all windows of an app, as the system-wide hotkey of iTerm2 does on macOS. The user can add many apps, each with one shortcut. The shortcut can be one key without a modifier, for example § on a Finnish keyboard.

## Decision

- Storage: one gsettings key `app-toggles` of type `a(ss)`. Each item is (app identifier, accelerator). The accelerator has the stored form of ADR 0013. An empty accelerator turns the entry off. The order of the list is the order of the rows in the preferences window.
- Key grab: the number of entries changes while the extension runs, so a schema key for each entry is not possible. The extension uses the accelerator API of Mutter: `global.display.grab_accelerator`, `Main.wm.allowKeybinding` with `Shell.ActionMode.NORMAL`, one handler on `accelerator-activated`, and `ungrab_accelerator` on each change and in `disable()`. Mutter gets the translated form (`translateHyper`).
- One owner for each combination: first the Rektangel actions in `allActions` order, then the entries in list order. A later owner is not grabbed. A grab that Mutter refuses, because GNOME or another program has the combination, is not retried. Each case gives one journal line.
- Mutter applies a change of an action keybinding in an idle callback with the priority `DEFAULT_IDLE + 10`. The extension grabs the entries again in an idle callback with a lower priority, so that a shortcut that an action releases is free.
- Keys without a modifier: permitted for the entries. The action rows keep the rule "at least one of Ctrl, Alt or Hyper". Mutter then takes the key in all windows, so the key does not type its character while the entry is on. The capture dialog shows this.
- Windows of an entry: the windows that the taskbar shows, on all workspaces, whose app id, window class, window instance, GTK application id or sandbox app id is equal to the identifier, without case and without a `.desktop` suffix.
- Hide: minimize without the animation. Show: unminimize the windows that the last hide minimized, raise the visible windows of the app in their stacking order, and give the focus to the window that had it at the hide, with the timestamp of the key press. A window on the active workspace is preferred. When nothing is remembered and all windows are minimized, all windows come back. When the app has no window, the extension starts it with `Shell.AppSystem`.
- Select the app with a click: the extension exports `/pet/repo/Rektangel`, interface `pet.repo.Rektangel`, on the bus connection of GNOME Shell. `PickWindow() -> (identifier, name)` takes the next pointer press with `Main.pushModal`.
- Conflicts: the entries use the same check as the action rows. The check now also treats the GNOME key name `Above_Tab` as the key name of keycode 49 on the current layout, and it reads the custom shortcuts of GNOME Settings. The IBus warning of ADR 0016 also applies to a key without a modifier and to a key with Shift only: the rule is no Alt, no Ctrl, and a dead key or a character above U+007F.

## Considered Options

- 16 schema keys `app-toggle-01` to `app-toggle-16` with `Main.wm.addKeybinding`: a fixed maximum and 16 keys in the schema. It was the fallback if `grab_accelerator` did not work. The spike in a nested GNOME Shell 46 showed that `grab_accelerator` gives an action id for `section`, `<Control>section` and `<Control><Shift>k`, so the fallback was not necessary.
- The app hides its own windows, for example the terminal: on Wayland an app can only unmap its windows. GNOME then places them again, so the position and the Rektangel frame are lost. An app also cannot take the focus without an activation token.
- The GlobalShortcuts portal: it needs GNOME 48.
- Move the windows to a hidden workspace: the windows lose their workspace.
- Hide the window actors without minimize: the taskbar and Alt+Tab still show the windows, and the focus stays.

## Consequences

- Minimize keeps the frame. The spike showed the same frame before the hide and after the show.
- The remembered windows live only in the extension. After a restart of GNOME Shell, a show restores all windows of the app when all of them are minimized.
- The shortcut does not work in the overview and on the lock screen.
- `gnome-keys.sh` does not read `app-toggles`. "Remove from GNOME" in the preferences window works for the entries. It cannot remove a custom shortcut of GNOME Settings, because the backup file and `gnome-keys.sh --undo` know only keys of type `as` with a fixed path.
- Any program on the session bus can call `PickWindow`, also again and again. Each pick takes the pointer and the keyboard until a click, Escape or 30 seconds, so such a program can keep the desktop in pick mode. The reply gives the app id or the window class of the window that the user clicks, and the name of its app or the window title. Only one pick can be active.
- There is no cooldown and no sender check. A program that runs as the user on the session bus can already do more harm, for example write the dconf settings of the user or stop GNOME Shell. A cooldown does not change what such a program can do.
- A custom shortcut of GNOME Settings and an entry with the same key: gsd-media-keys and the extension both grab with `grab_accelerator`, so the first grab wins, usually at login. The preferences window shows the conflict.

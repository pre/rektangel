import type Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
  allActions,
  defaultConfig,
  execute,
  type Action,
  type CoreConfig,
  type Monitor,
  type Rect,
  type WindowChange,
} from '@rektangel/core';
import { loadConfig } from './config-file.ts';
import { HistoryStore } from './history-store.ts';

const supportedWindowTypes = [Meta.WindowType.NORMAL, Meta.WindowType.DIALOG];

export default class RektangelExtension extends Extension {
  private settings: Gio.Settings | null = null;
  private config: Readonly<CoreConfig> = defaultConfig;
  private readonly history = new HistoryStore();

  override enable(): void {
    this.config = loadConfig();
    this.settings = this.getSettings();
    for (const action of allActions) {
      Main.wm.addKeybinding(action, this.settings, Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL, () =>
        this.onAction(action),
      );
    }
    console.log('Rektangel: enabled');
  }

  override disable(): void {
    for (const action of allActions) {
      Main.wm.removeKeybinding(action);
    }
    this.history.clear();
    this.settings = null;
    this.config = defaultConfig;
    console.log('Rektangel: disabled');
  }

  private onAction(action: Action): void {
    try {
      const window: Meta.Window | null = global.display.focus_window;
      if (window === null || !supportedWindowTypes.includes(window.get_window_type())) {
        return;
      }

      // Mutter allows_resize() is false for maximized, fullscreen and tiled
      // windows, but applyChange leaves those states before the resize.
      const canResize = window.allows_resize() || window.get_maximized() !== 0 || window.is_fullscreen();
      // Read the frame before applyChange unmaximizes the window: the restore
      // frame must be the frame that the user saw. On Wayland the frame does
      // not change until the client acknowledges the unmaximize.
      const result = execute({
        action,
        frame: toRect(window.get_frame_rect()),
        monitorIndex: window.get_monitor(),
        monitors: currentMonitors(),
        canResize,
        history: this.history.get(window),
        config: this.config,
      });

      this.history.set(window, result.history);
      if (result.change !== null) {
        applyChange(window, result.change, canResize);
        this.history.recordFrameAfterChange(window, result.change.frame);
      }
    } catch (error) {
      console.error(`Rektangel: ${action} failed`, error);
    }
  }
}

function toRect({ x, y, width, height }: Rect): Rect {
  return { x, y, width, height };
}

function currentMonitors(): Monitor[] {
  const workspace = global.workspace_manager.get_active_workspace();
  return Array.from({ length: global.display.get_n_monitors() }, (_, index) => ({
    index,
    geometry: toRect(global.display.get_monitor_geometry(index)),
    workArea: toRect(workspace.get_work_area_for_monitor(index)),
  }));
}

/**
 * Leaves fullscreen and GNOME maximized state first, because Mutter
 * ignores a frame change on a window in those states. The frame is in
 * absolute coordinates, so it also moves the window to the target
 * monitor. A window that cannot change size is only moved.
 */
function applyChange(window: Meta.Window, change: WindowChange, canResize: boolean): void {
  if (window.is_fullscreen()) {
    window.unmake_fullscreen();
  }
  if (window.get_maximized() !== 0) {
    window.unmaximize(Meta.MaximizeFlags.BOTH);
  }
  const { x, y, width, height } = change.frame;
  if (canResize) {
    window.move_resize_frame(true, x, y, width, height);
  } else {
    window.move_frame(true, x, y);
  }
}

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
  type WindowHistory,
} from '@rektangel/core';
import { loadConfig } from './config-file.ts';

interface TrackedWindow {
  window: Meta.Window;
  history: WindowHistory;
  unmanagedSignal: number;
}

const supportedWindowTypes = [Meta.WindowType.NORMAL, Meta.WindowType.DIALOG];

export default class RektangelExtension extends Extension {
  private settings: Gio.Settings | null = null;
  private config: Readonly<CoreConfig> = defaultConfig;
  /** Keyed by Meta.Window.get_id(). */
  private readonly tracked = new Map<number, TrackedWindow>();

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
    for (const id of [...this.tracked.keys()]) {
      this.forget(id);
    }
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

      const canResize = window.allows_resize();
      const result = execute({
        action,
        windowId: String(window.get_id()),
        frame: toRect(window.get_frame_rect()),
        monitorIndex: window.get_monitor(),
        monitors: currentMonitors(),
        canResize,
        history: this.tracked.get(window.get_id())?.history,
        config: this.config,
      });

      this.storeHistory(window, result.history);
      if (result.change !== null) {
        applyChange(window, result.change, canResize);
      }
    } catch (error) {
      console.error(`Rektangel: ${action} failed`, error);
    }
  }

  private storeHistory(window: Meta.Window, history: WindowHistory | undefined): void {
    const id = window.get_id();
    const tracked = this.tracked.get(id);
    if (history === undefined) {
      this.forget(id);
    } else if (tracked !== undefined) {
      tracked.history = history;
    } else {
      const unmanagedSignal = window.connect('unmanaged', () => this.forget(id));
      this.tracked.set(id, { window, history, unmanagedSignal });
    }
  }

  private forget(id: number): void {
    const tracked = this.tracked.get(id);
    if (tracked !== undefined) {
      tracked.window.disconnect(tracked.unmanagedSignal);
      this.tracked.delete(id);
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
 * ignores a frame change on a window in those states. A window that
 * cannot change size is only moved.
 */
function applyChange(window: Meta.Window, change: WindowChange, canResize: boolean): void {
  if (window.is_fullscreen()) {
    window.unmake_fullscreen();
  }
  if (window.get_maximized() !== 0) {
    window.unmaximize(Meta.MaximizeFlags.BOTH);
  }
  if (change.monitorIndex !== window.get_monitor()) {
    window.move_to_monitor(change.monitorIndex);
  }
  const { x, y, width, height } = change.frame;
  if (canResize) {
    window.move_resize_frame(true, x, y, width, height);
  } else {
    window.move_frame(true, x, y);
  }
}

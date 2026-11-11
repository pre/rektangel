import type Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { SuperKey } from './accelerator.ts';
import {
  appKey,
  appTogglesSetting,
  desktopIdCandidates,
  parseAppToggles,
  planGrabs,
  toggleDecision,
  windowMatchesApp,
  type AppToggle,
  type RememberedWindows,
} from './app-toggles.ts';

/** Lower than META_PRIORITY_PREFS_NOTIFY, which is DEFAULT_IDLE + 10. */
const afterMutterPrefsPriority = GLib.PRIORITY_DEFAULT_IDLE + 20;

/**
 * Grabs the shortcuts of the app-toggles entries and shows or hides the
 * windows of the app at a key press. The number of entries changes while
 * the extension runs, so the grabs use the accelerator API of Mutter and
 * not a schema key for each entry. See ADR 0017.
 */
export class AppToggles {
  /** The entry of each Mutter action id that this object grabbed. */
  private readonly grabs = new Map<number, AppToggle>();
  /** What the last hide of each app minimized, keyed by appKey. */
  private readonly remembered = new Map<string, RememberedWindows>();
  private readonly loggedLines = new Set<string>();
  private readonly activatedId: number;
  private readonly settingsId: number;
  private grabSourceId = 0;

  /**
   * `actionKeys` are the keybinding keys of the actions. A change of one of
   * them can take a shortcut from an entry or give it back.
   */
  constructor(
    private readonly stored: Gio.Settings,
    private readonly actionKeys: readonly string[],
    private superKey: SuperKey,
    private readonly log: (line: string) => void = console.log,
  ) {
    this.activatedId = global.display.connect(
      'accelerator-activated',
      (_display, action: number, _device, timestamp: number) => {
        const entry = this.grabs.get(action);
        if (entry !== undefined) {
          this.toggle(entry.app, timestamp);
        }
      },
    );
    this.settingsId = stored.connect('changed', (_settings: Gio.Settings, key: string) => {
      if (key === appTogglesSetting || this.actionKeys.includes(key)) {
        this.grabLater();
      }
    });
    this.grabAll();
  }

  /** The super-key setting, or 'super' when Caps Lock mode cannot work. */
  setSuperKey(superKey: SuperKey): void {
    if (superKey !== this.superKey) {
      this.superKey = superKey;
      this.grabLater();
    }
  }

  destroy(): void {
    if (this.grabSourceId !== 0) {
      GLib.source_remove(this.grabSourceId);
    }
    global.display.disconnect(this.activatedId);
    this.stored.disconnect(this.settingsId);
    this.ungrabAll();
    this.remembered.clear();
  }

  /**
   * Grabs again after Mutter has updated the keybindings of the actions.
   * Mutter applies a keybinding change in an idle callback with the
   * priority DEFAULT_IDLE + 10. Until then, an action keeps a shortcut that
   * it releases, and a grab of that shortcut fails.
   */
  private grabLater(): void {
    if (this.grabSourceId === 0) {
      this.grabSourceId = GLib.idle_add(afterMutterPrefsPriority, () => {
        this.grabSourceId = 0;
        this.grabAll();
        return GLib.SOURCE_REMOVE;
      });
    }
  }

  private grabAll(): void {
    this.ungrabAll();
    const entries = parseAppToggles(this.stored.get_value(appTogglesSetting).deepUnpack() as [string, string][]);
    const actions = new Map(this.actionKeys.map((key) => [key, this.stored.get_strv(key)]));
    const plan = planGrabs(entries, actions, this.superKey);
    plan.problems.forEach((line) => this.logOnce(line));
    for (const { index, accelerator } of plan.grabs) {
      const entry = entries[index]!;
      const action = global.display.grab_accelerator(accelerator, Meta.KeyBindingFlags.NONE);
      if (action === Meta.KeyBindingAction.NONE) {
        this.logOnce(`Rektangel: cannot grab ${accelerator} for app ${entry.app}, GNOME or another program uses it`);
        continue;
      }
      Main.wm.allowKeybinding(Meta.external_binding_name_for_action(action), Shell.ActionMode.NORMAL);
      this.grabs.set(action, entry);
    }
  }

  private ungrabAll(): void {
    for (const action of this.grabs.keys()) {
      global.display.ungrab_accelerator(action);
      Main.wm.allowKeybinding(Meta.external_binding_name_for_action(action), Shell.ActionMode.NONE);
    }
    this.grabs.clear();
  }

  private toggle(app: string, timestamp: number): void {
    try {
      const windows = appWindows(app);
      const key = appKey(app);
      const workspace = global.workspace_manager.get_active_workspace();
      const decision = toggleDecision({
        windows: windows.map((window) => ({
          id: window.get_id(),
          minimized: window.minimized,
          onActiveWorkspace: window.located_on_workspace(workspace),
          userTime: window.get_user_time(),
        })),
        focusId: focusedAppWindow(windows)?.get_id() ?? null,
        remembered: this.remembered.get(key),
      });
      const byId = new Map(windows.map((window) => [window.get_id(), window]));
      switch (decision.kind) {
        case 'start':
          this.start(app);
          break;
        case 'hide':
          this.remembered.set(key, decision.remember);
          for (const id of decision.minimize) {
            const window = byId.get(id)!;
            Main.wm.skipNextEffect(window.get_compositor_private());
            window.minimize();
          }
          break;
        case 'show':
          this.remembered.delete(key);
          for (const id of decision.unminimize) {
            const window = byId.get(id)!;
            Main.wm.skipNextEffect(window.get_compositor_private());
            window.unminimize();
          }
          decision.raise.forEach((id) => byId.get(id)!.raise());
          Main.activateWindow(byId.get(decision.focusId)!, timestamp);
          break;
      }
    } catch (error) {
      console.error(`Rektangel: show or hide of app ${app} failed`, error);
    }
  }

  private start(app: string): void {
    const appSystem = Shell.AppSystem.get_default();
    const lookups = [
      ...desktopIdCandidates(app).map((id) => () => appSystem.lookup_app(id)),
      () => appSystem.lookup_startup_wmclass(app),
      () => appSystem.lookup_desktop_wmclass(app),
    ];
    for (const lookup of lookups) {
      const shellApp = lookup() as Shell.App | null;
      if (shellApp !== null) {
        shellApp.activate();
        return;
      }
    }
    this.logOnce(`Rektangel: no app has the identifier ${app}, so it cannot start`);
  }

  private logOnce(line: string): void {
    if (!this.loggedLines.has(line)) {
      this.loggedLines.add(line);
      this.log(line);
    }
  }
}

/** The windows of the app that the taskbar shows, on all workspaces, bottom to top. */
function appWindows(app: string): Meta.Window[] {
  const tracker = Shell.WindowTracker.get_default();
  const windows = global.display.list_all_windows().filter(
    (window) =>
      !window.is_override_redirect() &&
      !window.is_skip_taskbar() &&
      windowMatchesApp(app, {
        appId: tracker.get_window_app(window)?.get_id() ?? null,
        wmClass: window.get_wm_class(),
        wmClassInstance: window.get_wm_class_instance(),
        gtkApplicationId: window.get_gtk_application_id(),
        sandboxedAppId: window.get_sandboxed_app_id(),
      }),
  );
  return global.display.sort_windows_by_stacking(windows);
}

/**
 * The window of the app that has the focus. A dialog is not in the taskbar,
 * so for a dialog it is the window that the dialog belongs to.
 */
function focusedAppWindow(windows: readonly Meta.Window[]): Meta.Window | null {
  let window: Meta.Window | null = global.display.focus_window;
  while (window !== null && !windows.includes(window)) {
    window = window.get_transient_for();
  }
  return window;
}

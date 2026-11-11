import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { pickedIdentifier, pickWindowInterface, pickWindowPath, topWindowAt } from './app-toggles.ts';

const interfaceXml = `
<node>
  <interface name="${pickWindowInterface}">
    <method name="PickWindow">
      <arg type="s" direction="out" name="identifier"/>
      <arg type="s" direction="out" name="name"/>
    </method>
  </interface>
</node>`;

const pickTimeoutSeconds = 30;

interface PickResult {
  readonly identifier: string;
  readonly name: string;
}

const noWindow: PickResult = { identifier: '', name: '' };

/**
 * Lets the preferences window ask for the app of a window that the user
 * clicks. The preferences window is a separate process and cannot see the
 * other windows on Wayland.
 */
export class PickWindowService {
  private readonly exported: Gio.DBusExportedObject;
  private pick: WindowPick | null = null;

  constructor() {
    this.exported = Gio.DBusExportedObject.wrapJSObject(interfaceXml, this);
    this.exported.export(Gio.DBus.session, pickWindowPath);
  }

  /** GJS calls this for PickWindow. The reply comes when the pick ends. */
  PickWindowAsync(_parameters: unknown[], invocation: Gio.DBusMethodInvocation): void {
    if (this.pick !== null) {
      invocation.return_dbus_error(`${pickWindowInterface}.Error.Busy`, 'Another pick is active');
      return;
    }
    this.pick = new WindowPick(({ identifier, name }) => {
      this.pick = null;
      invocation.return_value(new GLib.Variant('(ss)', [identifier, name]));
    });
    this.pick.start();
  }

  destroy(): void {
    this.pick?.cancel();
    this.exported.unexport();
  }
}

/**
 * A crosshair cursor and a modal grab until the next pointer press. The
 * primary button selects the top window below the pointer. Escape, the
 * secondary button and the timeout cancel. The grab always ends.
 */
class WindowPick {
  private readonly actor = new St.Widget({ reactive: true, x: 0, y: 0 });
  private grab: Clutter.Grab | null = null;
  private timeoutId = 0;
  private isDone = false;

  constructor(private readonly onDone: (result: PickResult) => void) {}

  start(): void {
    this.actor.set_size(global.stage.width, global.stage.height);
    Main.uiGroup.add_child(this.actor);
    const grab = Main.pushModal(this.actor, { actionMode: Shell.ActionMode.NONE });
    this.grab = grab;
    this.timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, pickTimeoutSeconds, () => {
      this.timeoutId = 0;
      this.cancel();
      return GLib.SOURCE_REMOVE;
    });
    if (grab.get_seat_state() !== Clutter.GrabState.ALL) {
      this.cancel();
      return;
    }
    global.display.set_cursor(Meta.Cursor.CROSSHAIR);
    this.actor.connect('button-press-event', (_actor, event: Clutter.Event) => {
      if (event.get_button() === Clutter.BUTTON_PRIMARY) {
        const [x, y] = event.get_coords();
        this.select(x, y);
      } else if (event.get_button() === Clutter.BUTTON_SECONDARY) {
        this.cancel();
      }
      return Clutter.EVENT_STOP;
    });
    this.actor.connect('key-press-event', (_actor, event: Clutter.Event) => {
      if (event.get_key_symbol() === Clutter.KEY_Escape) {
        this.cancel();
      }
      return Clutter.EVENT_STOP;
    });
  }

  /** Ends the pick with the window at the stage position. */
  select(x: number, y: number): void {
    let result = noWindow;
    try {
      const window = windowAt(x, y);
      result = window === null ? noWindow : describe(window);
    } catch (error) {
      console.error('Rektangel: cannot find the window below the pointer', error);
    }
    this.finish(result);
  }

  cancel(): void {
    this.finish(noWindow);
  }

  private finish(result: PickResult): void {
    if (this.isDone) {
      return;
    }
    this.isDone = true;
    try {
      if (this.timeoutId !== 0) {
        GLib.source_remove(this.timeoutId);
      }
      global.display.set_cursor(Meta.Cursor.DEFAULT);
      if (this.grab !== null) {
        Main.popModal(this.grab);
      }
      this.actor.destroy();
    } finally {
      this.onDone(result);
    }
  }
}

/** The top window at the stage position on the active workspace, or the window that its dialog belongs to. */
function windowAt(x: number, y: number): Meta.Window | null {
  const workspace = global.workspace_manager.get_active_workspace();
  const ignoredTypes = [Meta.WindowType.DESKTOP, Meta.WindowType.DOCK];
  const visible = global.display
    .list_all_windows()
    .filter(
      (window) =>
        !window.minimized &&
        !window.is_override_redirect() &&
        !ignoredTypes.includes(window.get_window_type()) &&
        window.located_on_workspace(workspace),
    );
  const stacked = global.display.sort_windows_by_stacking(visible);
  let window = topWindowAt(
    stacked.map((candidate) => ({ id: candidate, frame: candidate.get_frame_rect() })),
    x,
    y,
  );
  while (window?.get_transient_for()) {
    window = window.get_transient_for();
  }
  return window;
}

function describe(window: Meta.Window): PickResult {
  const app = Shell.WindowTracker.get_default().get_window_app(window) as Shell.App | null;
  const identifier = pickedIdentifier({
    appId: app?.get_id() ?? null,
    hasDesktopFile: (app?.get_app_info() ?? null) !== null,
    wmClass: window.get_wm_class(),
  });
  return { identifier, name: app?.get_name() ?? window.get_title() ?? '' };
}

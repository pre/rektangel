import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import { schemaShortName, type GnomeBinding } from './gnome-conflicts.ts';
import { hasCommandModifier } from './shortcuts.ts';

export interface CaptureRequest {
  readonly actionTitle: string;
  readonly current: string;
  /** The title of the other action that uses the accelerator, or null. */
  readonly conflictOf: (accelerator: string) => string | null;
  /** The GNOME keys that use the accelerator. */
  readonly gnomeConflictsOf: (accelerator: string) => readonly GnomeBinding[];
  /** Removes the accelerator from these GNOME keys. Throws on failure. */
  readonly removeFromGnome: (accelerator: string, bindings: readonly GnomeBinding[]) => void;
  /** Gets the new accelerator, or '' to disable the action. */
  readonly onSave: (accelerator: string) => void;
}

/** The text that GTK shows for an accelerator, or "Disabled". */
export function acceleratorLabel(accelerator: string): string {
  if (accelerator === '') {
    return 'Disabled';
  }
  const [ok, key, modifiers] = Gtk.accelerator_parse(accelerator);
  return ok && modifiers !== null ? Gtk.accelerator_get_label(key, modifiers) : accelerator;
}

function inhibitStateText(inhibited: boolean): string {
  return inhibited
    ? 'System shortcuts are paused, press your combination.'
    : 'GNOME did not pause its shortcuts. If your key press does not appear here, GNOME already uses it. ' +
        'Remove it in Settings > Keyboard or with gnome-keys.sh, then try again.';
}

/**
 * Shows a dialog that records the next key combination. Escape cancels,
 * BackSpace disables the action. The value is saved only when the user
 * clicks Set.
 */
export function presentCaptureDialog(parent: Gtk.Widget, request: CaptureRequest): void {
  const shortcut = new Gtk.Label({ label: acceleratorLabel(request.current), css_classes: ['title-2'] });
  const hint = new Gtk.Label({
    label: 'If the keys you press do not appear, the shortcut is probably already in use.',
    wrap: true,
    css_classes: ['dim-label'],
  });
  const inhibitState = new Gtk.Label({ label: inhibitStateText(false), wrap: true, css_classes: ['dim-label'] });
  const problem = new Gtk.Label({ wrap: true, css_classes: ['error'], visible: false });
  const gnomeUse = new Gtk.Label({ wrap: true, css_classes: ['warning'] });
  const removeButton = new Gtk.Button({ label: 'Remove from GNOME', halign: Gtk.Align.CENTER });
  const gnomeBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, visible: false });
  gnomeBox.append(gnomeUse);
  gnomeBox.append(removeButton);
  const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 });
  [shortcut, hint, inhibitState, problem, gnomeBox].forEach((widget) => content.append(widget));

  const dialog = new Adw.AlertDialog({
    heading: `Set Shortcut for ${request.actionTitle}`,
    body: 'Press the new key combination. Press Escape to cancel, or BackSpace to disable the action.',
    extra_child: content,
    close_response: 'cancel',
  });
  dialog.add_response('cancel', 'Cancel');
  dialog.add_response('set', 'Set');
  dialog.set_response_appearance('set', Adw.ResponseAppearance.SUGGESTED);
  dialog.set_response_enabled('set', false);

  let pending: string | null = null;
  let recorded = '';
  const showGnomeUse = (accelerator: string): void => {
    const bindings = request.gnomeConflictsOf(accelerator);
    gnomeUse.label = bindings.map((b) => `Used by GNOME: ${schemaShortName(b.schema)} ${b.key}`).join('\n');
    removeButton.visible = true;
    gnomeBox.visible = bindings.length > 0;
  };
  const offer = (accelerator: string): void => {
    recorded = accelerator;
    shortcut.label = acceleratorLabel(accelerator);
    const conflict = request.conflictOf(accelerator);
    let reason = '';
    if (accelerator !== '' && !hasCommandModifier(accelerator)) {
      reason = 'Use at least one of Ctrl, Alt or Super.';
    } else if (conflict !== null) {
      reason = `${conflict} already uses this shortcut.`;
    }
    problem.label = reason;
    problem.visible = reason !== '';
    pending = reason === '' ? accelerator : null;
    dialog.set_response_enabled('set', pending !== null);
    showGnomeUse(accelerator);
  };

  removeButton.connect('clicked', () => {
    try {
      request.removeFromGnome(recorded, request.gnomeConflictsOf(recorded));
      showGnomeUse(recorded);
    } catch (error) {
      gnomeUse.label = `Cannot remove the GNOME shortcut: ${error}`;
      removeButton.visible = false;
    }
  });

  // The capture phase gets the keys before the buttons of the dialog do.
  const keys = new Gtk.EventControllerKey({ propagation_phase: Gtk.PropagationPhase.CAPTURE });
  keys.connect('key-pressed', (_controller, keyval, _keycode, state) => {
    const modifiers = state & Gtk.accelerator_get_default_mod_mask();
    const key = Gdk.keyval_to_lower(keyval);
    if (modifiers === 0 && key === Gdk.KEY_Escape) {
      dialog.close();
    } else if (modifiers === 0 && key === Gdk.KEY_BackSpace) {
      offer('');
    } else if (Gtk.accelerator_valid(key, modifiers)) {
      offer(Gtk.accelerator_name(key, modifiers));
    }
    // A bare modifier is not a valid accelerator: wait for the next key.
    return true;
  });
  dialog.add_controller(keys);

  // Without the inhibit, GNOME Shell takes its own and the Rektangel
  // shortcuts before the dialog sees them. The compositor can refuse or
  // ask the user first, so the dialog shows the live state.
  let toplevel: Gdk.Toplevel | null = null;
  let notifyId = 0;
  dialog.connect('map', () => {
    toplevel = (dialog.get_native()?.get_surface() as Gdk.Toplevel | null) ?? null;
    if (toplevel === null) {
      return;
    }
    const surface = toplevel;
    surface.inhibit_system_shortcuts(null);
    inhibitState.label = inhibitStateText(surface.shortcuts_inhibited);
    notifyId = surface.connect('notify::shortcuts-inhibited', () => {
      inhibitState.label = inhibitStateText(surface.shortcuts_inhibited);
    });
  });
  dialog.connect('unmap', () => {
    toplevel?.restore_system_shortcuts();
    if (notifyId !== 0) {
      toplevel?.disconnect(notifyId);
      notifyId = 0;
    }
  });

  dialog.connect('response', (_dialog, response) => {
    if (response === 'set' && pending !== null) {
      request.onSave(pending);
    }
  });
  dialog.present(parent);
}

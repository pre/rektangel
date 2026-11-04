import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import { hasCommandModifier } from './shortcuts.ts';

export interface CaptureRequest {
  readonly actionTitle: string;
  readonly current: string;
  /** The title of the other action that uses the accelerator, or null. */
  readonly conflictOf: (accelerator: string) => string | null;
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

/**
 * Shows a dialog that records the next key combination. Escape cancels,
 * BackSpace disables the action. The value is saved only when the user
 * clicks Set.
 */
export function presentCaptureDialog(parent: Gtk.Widget, request: CaptureRequest): void {
  const shortcut = new Gtk.Label({ label: acceleratorLabel(request.current), css_classes: ['title-2'] });
  const problem = new Gtk.Label({ wrap: true, css_classes: ['error'], visible: false });
  const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 });
  content.append(shortcut);
  content.append(problem);

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
  const offer = (accelerator: string): void => {
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
  };

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
  // shortcuts before the dialog sees them.
  const toplevel = (): Gdk.Toplevel | null => (dialog.get_native()?.get_surface() as Gdk.Toplevel | null) ?? null;
  dialog.connect('map', () => toplevel()?.inhibit_system_shortcuts(null));
  dialog.connect('unmap', () => toplevel()?.restore_system_shortcuts());

  dialog.connect('response', (_dialog, response) => {
    if (response === 'set' && pending !== null) {
      request.onSave(pending);
    }
  });
  dialog.present(parent);
}

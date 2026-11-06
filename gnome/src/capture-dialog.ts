import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import { conflictWording, isIbusEmojiPicker, schemaShortName, type GnomeBinding } from './gnome-conflicts.ts';
import type { SuperKey } from './accelerator.ts';
import { acceleratorLabelParts, capturedAccelerator, checkCapture, prettyAccelLabel } from './shortcuts.ts';

export interface CaptureRequest {
  readonly actionTitle: string;
  readonly current: string;
  /** The super-key setting: the physical key of <Hyper>. */
  readonly superKey: SuperKey;
  /** The title of the other action that uses the accelerator, or null. */
  readonly conflictOf: (accelerator: string) => string | null;
  /** The GNOME keys that use the accelerator. */
  readonly gnomeConflictsOf: (accelerator: string) => readonly GnomeBinding[];
  /** Removes the accelerator from these GNOME keys. Throws on failure. */
  readonly removeFromGnome: (accelerator: string, bindings: readonly GnomeBinding[]) => void;
  /** Gets the new accelerator, or '' to disable the action. */
  readonly onSave: (accelerator: string) => void;
}

/** The display text of an accelerator, for example "Hyper Left" or "Windows U", or "Disabled". */
export function acceleratorLabel(accelerator: string): string {
  if (accelerator === '') {
    return 'Disabled';
  }
  const { modifiers, key } = acceleratorLabelParts(accelerator);
  const keyval = Gdk.keyval_from_name(key);
  const keyLabel = keyval === Gdk.KEY_VoidSymbol ? key : Gtk.accelerator_get_label(keyval, 0);
  return prettyAccelLabel([...modifiers, keyLabel]);
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
  const gnomeBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, visible: false });
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
  // One section for the IBus emoji picker and one for the other GNOME
  // keys, each with a button that removes only its own keys.
  const showGnomeUse = (accelerator: string): void => {
    for (let child = gnomeBox.get_first_child(); child !== null; child = gnomeBox.get_first_child()) {
      gnomeBox.remove(child);
    }
    const bindings = request.gnomeConflictsOf(accelerator);
    const [ibus] = bindings.filter(isIbusEmojiPicker);
    const gnome = bindings.filter((binding) => !isIbusEmojiPicker(binding));
    if (ibus !== undefined) {
      const wording = conflictWording(ibus, acceleratorLabel(accelerator));
      addSection(accelerator, [ibus], [wording.explanation, wording.entry], wording.button);
    }
    if (gnome.length > 0) {
      const used = gnome.map((b) => `Used by GNOME: ${schemaShortName(b.schema)} ${b.key}`);
      addSection(accelerator, gnome, used, 'Remove from GNOME');
    }
    gnomeBox.visible = bindings.length > 0;
  };
  const addSection = (
    accelerator: string,
    bindings: readonly GnomeBinding[],
    lines: readonly string[],
    buttonLabel: string,
  ): void => {
    const text = new Gtk.Label({ label: lines.join('\n'), wrap: true, css_classes: ['warning'] });
    const button = new Gtk.Button({ label: buttonLabel, halign: Gtk.Align.CENTER });
    button.connect('clicked', () => {
      try {
        request.removeFromGnome(accelerator, bindings);
        showGnomeUse(accelerator);
      } catch (error) {
        text.label = `Cannot remove the shortcut: ${error}`;
        button.visible = false;
      }
    });
    gnomeBox.append(text);
    gnomeBox.append(button);
  };
  const offer = (captured: string): void => {
    const { accelerator, problem: reason } = checkCapture(captured, request.superKey, request.conflictOf);
    shortcut.label = acceleratorLabel(accelerator);
    problem.label = reason ?? '';
    problem.visible = reason !== null;
    pending = reason === null ? accelerator : null;
    dialog.set_response_enabled('set', pending !== null);
    showGnomeUse(accelerator);
  };

  // GTK does not name the Super and Hyper modifier masks reliably: a Caps
  // Lock press gave <Super><Hyper>. So the dialog follows the keyvals of
  // the physical keys, and takes only Shift, Ctrl and Alt from the mask.
  let windowsHeld = false;
  let capsHeld = false;
  const trackModifier = (keyval: number, isHeld: boolean): void => {
    if (keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R) {
      windowsHeld = isHeld;
    } else if (keyval === Gdk.KEY_Hyper_L) {
      capsHeld = isHeld;
    }
  };
  const shiftCtrlAlt = Gdk.ModifierType.SHIFT_MASK | Gdk.ModifierType.CONTROL_MASK | Gdk.ModifierType.ALT_MASK;

  // The capture phase gets the keys before the buttons of the dialog do.
  const keys = new Gtk.EventControllerKey({ propagation_phase: Gtk.PropagationPhase.CAPTURE });
  keys.connect('key-pressed', (_controller, keyval, _keycode, state) => {
    trackModifier(keyval, true);
    const modifiers = state & Gtk.accelerator_get_default_mod_mask() & shiftCtrlAlt;
    const key = Gdk.keyval_to_lower(keyval);
    const isPlain = modifiers === 0 && !windowsHeld && !capsHeld;
    if (isPlain && key === Gdk.KEY_Escape) {
      dialog.close();
    } else if (isPlain && key === Gdk.KEY_BackSpace) {
      offer('');
    } else if (Gtk.accelerator_valid(key, modifiers)) {
      const held = {
        shift: (modifiers & Gdk.ModifierType.SHIFT_MASK) !== 0,
        control: (modifiers & Gdk.ModifierType.CONTROL_MASK) !== 0,
        alt: (modifiers & Gdk.ModifierType.ALT_MASK) !== 0,
        windows: windowsHeld,
        capsLock: capsHeld,
      };
      offer(capturedAccelerator(held, Gdk.keyval_name(key) ?? ''));
    }
    // A bare modifier is not a valid accelerator: wait for the next key.
    return true;
  });
  keys.connect('key-released', (_controller, keyval) => trackModifier(keyval, false));
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

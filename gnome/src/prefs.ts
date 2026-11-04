import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import type Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { allActions, type Action } from '@rektangel/core';
import { acceleratorLabel, presentCaptureDialog } from './capture-dialog.ts';
import { installXkbOption, removeXkbOption } from './capslock-mode.ts';
import {
  findGnomeConflicts,
  rowConflicts,
  schemaTitle,
  type GnomeBinding,
  type KeybindingTables,
  type RowConflict,
} from './gnome-conflicts.ts';
import { gnomeKeybindingSettings, readGnomeKeybindings, removeFromGnome } from './gnome-keybindings.ts';
import { keyName } from './key-names.ts';
import { findConflict, shortcutGroups } from './shortcuts.ts';

/** The space that the window leaves free above and below on the monitor. */
const monitorMargin = 80;

export default class RektangelPreferences extends ExtensionPreferences {
  override fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const settings = this.getSettings();
    const page = new Adw.PreferencesPage({
      title: 'Shortcuts',
      icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
    });
    window.add(page);

    page.add(superKeyGroup(settings, this.dir));
    page.add(headerGroup(window, settings));

    const gnomeSettings = gnomeKeybindingSettings();
    let gnomeTables = readGnomeKeybindings(gnomeSettings);
    const refreshers = new Map<Action, (conflicts: readonly RowConflict[]) => void>();
    const refreshAll = (): void => {
      const bindings = currentBindings(settings);
      const gnome = withGnomeConflicts(settings) ? gnomeTables : emptyTables;
      refreshers.forEach((refresh, action) => refresh(rowConflicts(action, bindings, gnome)));
    };
    const reloadGnome = (): void => {
      gnomeTables = readGnomeKeybindings(gnomeSettings);
      refreshAll();
    };
    const removeConflict = (conflict: GnomeConflict): void => {
      try {
        removeFromGnome(conflict, conflict.accelerator);
      } catch (error) {
        window.add_toast(new Adw.Toast({ title: `Cannot remove the GNOME shortcut: ${error}`, timeout: 0 }));
      }
      reloadGnome();
    };

    for (const group of shortcutGroups) {
      const preferencesGroup = new Adw.PreferencesGroup({ title: group.title });
      for (const action of group.actions) {
        const { row, refresh } = shortcutRow(window, settings, action, removeConflict);
        refreshers.set(action, refresh);
        preferencesGroup.add(row);
      }
      page.add(preferencesGroup);
    }
    page.add(gnomeNoteGroup(`${this.path}/gnome-keys.sh`));
    refreshAll();

    // A change of one shortcut can add or remove a conflict on other rows.
    settings.connect('changed', refreshAll);
    const gnomeIds = gnomeSettings.map((gnome) => gnome.connect('changed', reloadGnome));
    window.connect('close-request', () => {
      gnomeSettings.forEach((gnome, index) => gnome.disconnect(gnomeIds[index] ?? 0));
      return false;
    });
    fitToContent(window, page);
  }
}

function* descendants(widget: Gtk.Widget): Generator<Gtk.Widget> {
  yield widget;
  for (let child = widget.get_first_child(); child !== null; child = child.get_next_sibling()) {
    yield* descendants(child);
  }
}

/**
 * Makes the window as tall as its content, but not taller than the
 * monitor, and shows a classic scrollbar when the content does not fit.
 */
function fitToContent(window: Adw.PreferencesWindow, page: Adw.PreferencesPage): void {
  const scrolled = [...descendants(page)].find((widget) => widget instanceof Gtk.ScrolledWindow);
  if (scrolled instanceof Gtk.ScrolledWindow) {
    scrolled.overlay_scrolling = false;
    scrolled.propagate_natural_height = true;
  }
  const fit = (monitor: Gdk.Monitor): void => {
    const [, natural] = window.measure(Gtk.Orientation.VERTICAL, window.default_width);
    window.default_height = Math.min(natural, monitor.get_geometry().height - monitorMargin);
  };
  // Before the window is on screen, Wayland does not tell which monitor it
  // goes to. Fit to the first monitor, then again to the monitor that the
  // window enters first.
  window.connect('realize', () => {
    fit(window.get_display().get_monitors().get_item(0) as Gdk.Monitor);
    const surface = window.get_surface() as Gdk.Surface;
    const id = surface.connect('enter-monitor', (_surface, monitor: Gdk.Monitor) => {
      surface.disconnect(id);
      fit(monitor);
    });
  });
}

function actionTitle(settings: Gio.Settings, action: Action): string {
  return settings.settings_schema.get_key(keyName(action)).get_summary() ?? action;
}

const superKeyChoices = ['super', 'capslock'] as const;

function superKeyGroup(settings: Gio.Settings, extensionDir: Gio.File): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({ title: 'Super Key' });
  const row = new Adw.ComboRow({
    title: 'Super key',
    model: Gtk.StringList.new(['Windows key', 'Caps Lock']),
  });
  const storedNote = new Gtk.Label({
    label: 'Shortcuts below are stored with Super. Changing the Super key changes all of them at once.',
    wrap: true,
    xalign: 0,
    margin_top: 12,
    css_classes: ['dim-label'],
  });
  const changeNote = new Gtk.Label({ wrap: true, xalign: 0, margin_top: 6, visible: false });
  [row, storedNote, changeNote].forEach((widget) => group.add(widget));

  const sync = (): void => {
    const value = settings.get_string('super-key');
    group.description =
      value === 'capslock'
        ? 'Super is Caps Lock.'
        : 'Super is the Windows key (the key with the Windows logo, Cmd on a Mac keyboard).';
    row.selected = value === 'capslock' ? 1 : 0;
  };
  sync();
  settings.connect('changed::super-key', sync);

  const showNote = (text: string, isError: boolean): void => {
    changeNote.label = text;
    changeNote.css_classes = isError ? ['error'] : [];
    changeNote.visible = true;
  };
  row.connect('notify::selected', () => {
    const value = superKeyChoices[row.selected];
    if (value === undefined || value === settings.get_string('super-key')) {
      return;
    }
    try {
      if (value === 'capslock') {
        installXkbOption(extensionDir.get_path() ?? "");
        showNote('Caps Lock becomes a modifier after you log out and in. Shift+Caps Lock toggles caps lock.', false);
      } else {
        removeXkbOption(extensionDir.get_path() ?? "");
        showNote('Caps Lock is a normal key again after you log out and in.', false);
      }
      settings.set_string('super-key', value);
    } catch (error) {
      showNote(`Cannot change the Super key: ${error}`, true);
      sync();
    }
  });
  return group;
}

function headerGroup(window: Adw.PreferencesWindow, settings: Gio.Settings): Adw.PreferencesGroup {
  const resetAll = new Gtk.Button({ label: 'Reset All', valign: Gtk.Align.CENTER });
  resetAll.connect('clicked', () => {
    const dialog = new Adw.AlertDialog({
      heading: 'Reset All Shortcuts?',
      body: 'All Rektangel shortcuts get their default values again.',
      close_response: 'cancel',
    });
    dialog.add_response('cancel', 'Cancel');
    dialog.add_response('reset', 'Reset All');
    dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
    dialog.connect('response', (_dialog, response) => {
      if (response === 'reset') {
        allActions.forEach((action) => settings.reset(keyName(action)));
      }
    });
    dialog.present(window);
  });
  return new Adw.PreferencesGroup({
    title: 'Keyboard Shortcuts',
    description: 'Click an action to set its shortcut.',
    header_suffix: resetAll,
  });
}

type GnomeConflict = Extract<RowConflict, { kind: 'gnome' }>;

const emptyTables: KeybindingTables = new Map();

/**
 * With Caps Lock as Super, the extension grabs <Mod3> instead of <Super>,
 * so GNOME keys do not conflict.
 */
function withGnomeConflicts(settings: Gio.Settings): boolean {
  return settings.get_string('super-key') !== 'capslock';
}

/** The GNOME keys that use the accelerator. */
function gnomeConflictsOf(settings: Gio.Settings, accelerator: string): GnomeBinding[] {
  return withGnomeConflicts(settings) ? findGnomeConflicts(accelerator, readGnomeKeybindings()) : [];
}

function conflictText(settings: Gio.Settings, conflict: RowConflict): string {
  return conflict.kind === 'gnome'
    ? `${schemaTitle(conflict.schema)} › ${conflict.key} (${acceleratorLabel(conflict.accelerator)})`
    : `Also used by Rektangel: ${actionTitle(settings, conflict.action)}`;
}

/**
 * A red warning button that is visible when the row has conflicts. Its
 * popover lists them, with a remove button for each GNOME key.
 */
function conflictBadge(
  settings: Gio.Settings,
  removeConflict: (conflict: GnomeConflict) => void,
): { badge: Gtk.MenuButton; show: (conflicts: readonly RowConflict[]) => void } {
  const popover = new Gtk.Popover();
  const badge = new Gtk.MenuButton({
    icon_name: 'dialog-warning-symbolic',
    valign: Gtk.Align.CENTER,
    css_classes: ['flat', 'error'],
    popover,
  });
  const label = (text: string, cssClasses: string[] = []): Gtk.Label =>
    new Gtk.Label({ label: text, wrap: true, max_width_chars: 40, xalign: 0, css_classes: cssClasses });

  const show = (conflicts: readonly RowConflict[]): void => {
    badge.visible = conflicts.length > 0;
    const hasGnome = conflicts.some((conflict) => conflict.kind === 'gnome');
    badge.tooltip_text = hasGnome ? 'Conflicts with a GNOME shortcut' : 'Conflicts with another Rektangel shortcut';
    const box = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 6,
      margin_top: 6,
      margin_bottom: 6,
      margin_start: 6,
      margin_end: 6,
    });
    if (hasGnome) {
      box.append(
        label('GNOME handles this shortcut before Rektangel. Remove it from GNOME to let Rektangel use it.', [
          'dim-label',
        ]),
      );
    }
    for (const conflict of conflicts) {
      box.append(label(conflictText(settings, conflict), ['heading']));
      if (conflict.kind === 'gnome') {
        const remove = new Gtk.Button({ label: 'Remove from GNOME', halign: Gtk.Align.START });
        remove.connect('clicked', () => {
          popover.popdown();
          removeConflict(conflict);
        });
        box.append(remove);
      }
    }
    popover.child = box;
  };
  return { badge, show };
}

function shortcutRow(
  window: Adw.PreferencesWindow,
  settings: Gio.Settings,
  action: Action,
  removeConflict: (conflict: GnomeConflict) => void,
): { row: Adw.ActionRow; refresh: (conflicts: readonly RowConflict[]) => void } {
  const key = keyName(action);
  const title = actionTitle(settings, action);
  const row = new Adw.ActionRow({ title, activatable: true });
  const label = new Gtk.Label({ css_classes: ['dim-label'] });
  const reset = new Gtk.Button({
    icon_name: 'edit-undo-symbolic',
    tooltip_text: 'Reset to Default',
    valign: Gtk.Align.CENTER,
    css_classes: ['flat'],
  });
  const { badge, show } = conflictBadge(settings, removeConflict);
  row.add_suffix(badge);
  row.add_suffix(label);
  row.add_suffix(reset);

  const refresh = (conflicts: readonly RowConflict[]): void => {
    show(conflicts);
    const accelerators = settings.get_strv(key);
    label.label = accelerators.length === 0 ? acceleratorLabel('') : accelerators.map(acceleratorLabel).join(', ');
    const defaultValue = settings.get_default_value(key);
    reset.visible = defaultValue !== null && !settings.get_value(key).equal(defaultValue);
  };

  reset.connect('clicked', () => settings.reset(key));
  row.connect('activated', () =>
    presentCaptureDialog(window, {
      actionTitle: title,
      current: settings.get_strv(key)[0] ?? '',
      conflictOf: (accelerator) => {
        const other = findConflict(accelerator, action, currentBindings(settings));
        return other === null ? null : actionTitle(settings, other);
      },
      gnomeConflictsOf: (accelerator) => gnomeConflictsOf(settings, accelerator),
      removeFromGnome: (accelerator, bindings) => bindings.forEach((binding) => removeFromGnome(binding, accelerator)),
      onSave: (accelerator) => {
        settings.set_strv(key, accelerator === '' ? [] : [accelerator]);
        if (gnomeConflictsOf(settings, accelerator).length > 0) {
          window.add_toast(
            new Adw.Toast({
              title: `GNOME also uses ${acceleratorLabel(accelerator)}, so ${title} may not work.`,
              timeout: 0,
            }),
          );
        }
      },
    }),
  );
  return { row, refresh };
}

function currentBindings(settings: Gio.Settings): Map<Action, readonly string[]> {
  return new Map(allActions.map((action) => [action, settings.get_strv(keyName(action))]));
}

function gnomeNoteGroup(scriptPath: string): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({ title: 'Keyboard Shortcuts in Use by GNOME' });
  const text = new Gtk.Label({
    label:
      'GNOME has its own shortcuts, and some of them use the same keys as the Rektangel defaults. ' +
      'When you set a shortcut that GNOME uses, the dialog tells you and can remove it from GNOME. ' +
      'To remove all the GNOME shortcuts that conflict with the defaults, run this script in a terminal ' +
      '(add --dry-run to see the changes first):',
    wrap: true,
    xalign: 0,
  });
  const script = new Gtk.Label({
    label: `bash ${scriptPath}`,
    selectable: true,
    wrap: true,
    xalign: 0,
    css_classes: ['monospace'],
  });
  const settingsHint = new Gtk.Label({
    label: 'To see or change the GNOME shortcuts, open Settings > Keyboard > View and Customize Shortcuts.',
    wrap: true,
    xalign: 0,
  });
  const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 });
  [text, script, settingsHint].forEach((label) => box.append(label));
  group.add(box);
  return group;
}

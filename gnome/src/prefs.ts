import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import type Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { allActions, type Action } from '@rektangel/core';
import { acceleratorLabel, presentCaptureDialog } from './capture-dialog.ts';
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
import { gnomeNoteGroup, headerGroup, superKeyGroup } from './prefs-groups.ts';
import { findConflict, shortcutGroups, splitIntoColumns } from './shortcuts.ts';

/** The space that the window leaves free above and below on the monitor. */
const monitorMargin = 80;

const defaultWidth = 1000;

/** The page clamps its content to 600 px. The columns need more. */
const pageMaximumWidth = 1100;

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

    const columns = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 24, homogeneous: true });
    for (const column of splitIntoColumns(shortcutGroups)) {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 24, valign: Gtk.Align.START });
      for (const group of column) {
        const preferencesGroup = new Adw.PreferencesGroup({ title: group.title });
        for (const action of group.actions) {
          const { row, refresh } = shortcutRow(window, settings, action, removeConflict);
          refreshers.set(action, refresh);
          preferencesGroup.add(row);
        }
        box.append(preferencesGroup);
      }
      columns.append(box);
    }
    const columnsGroup = new Adw.PreferencesGroup();
    columnsGroup.add(columns);
    page.add(columnsGroup);
    page.add(gnomeNoteGroup(`${this.path}/gnome-keys.sh`));
    refreshAll();

    // A change of one shortcut can add or remove a conflict on other rows.
    settings.connect('changed', refreshAll);
    const gnomeIds = gnomeSettings.map((gnome) => gnome.connect('changed', reloadGnome));
    window.connect('close-request', () => {
      gnomeSettings.forEach((gnome, index) => gnome.disconnect(gnomeIds[index] ?? 0));
      return false;
    });
    window.default_width = defaultWidth;
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
  const widgets = [...descendants(page)];
  const scrolled = widgets.find((widget) => widget instanceof Gtk.ScrolledWindow);
  if (scrolled instanceof Gtk.ScrolledWindow) {
    scrolled.overlay_scrolling = false;
    scrolled.propagate_natural_height = true;
  }
  const clamp = widgets.find((widget) => widget instanceof Adw.Clamp);
  if (clamp instanceof Adw.Clamp) {
    clamp.maximum_size = pageMaximumWidth;
  }
  // Measure the outermost toolbar view, the one with the header bar. The
  // window itself has an AdwBreakpointBin, which gives the height for the
  // natural width of the content: wrapped text then has fewer lines than at
  // the window width.
  let frame: Gtk.Widget = page;
  for (let widget = page.get_parent(); widget !== null; widget = widget.get_parent()) {
    if (widget instanceof Adw.ToolbarView) {
      frame = widget;
    }
  }
  const fit = (monitor: Gdk.Monitor): void => {
    const [, natural] = frame.measure(Gtk.Orientation.VERTICAL, window.default_width);
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
    ? `${schemaTitle(conflict.schema)} âº ${conflict.key} (${acceleratorLabel(conflict.accelerator)})`
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
  const row = new Adw.ActionRow({ title, activatable: false });
  const label = new Gtk.Label();
  const shortcut = new Gtk.Button({ child: label, valign: Gtk.Align.CENTER, tooltip_text: 'Set Shortcut' });
  const reset = new Gtk.Button({
    icon_name: 'edit-undo-symbolic',
    tooltip_text: 'Reset to Default',
    valign: Gtk.Align.CENTER,
    css_classes: ['flat'],
  });
  const { badge, show } = conflictBadge(settings, removeConflict);
  row.add_suffix(badge);
  row.add_suffix(shortcut);
  row.add_suffix(reset);

  const refresh = (conflicts: readonly RowConflict[]): void => {
    show(conflicts);
    const accelerators = settings.get_strv(key);
    const isEmpty = accelerators.length === 0;
    label.label = isEmpty ? 'Set shortcut…' : accelerators.map(acceleratorLabel).join(', ');
    label.css_classes = isEmpty ? ['dim-label'] : ['keycap'];
    const defaultValue = settings.get_default_value(key);
    reset.visible = defaultValue !== null && !settings.get_value(key).equal(defaultValue);
  };

  reset.connect('clicked', () => settings.reset(key));
  shortcut.connect('clicked', () =>
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

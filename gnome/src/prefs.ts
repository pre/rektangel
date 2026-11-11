import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import type Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { allActions, type Action } from '@rektangel/core';
import { superKeySetting, type SuperKey } from './accelerator.ts';
import { acceleratorLabel, presentCaptureDialog } from './capture-dialog.ts';
import {
  canConflictWithGnome,
  conflictSections,
  findGnomeConflicts,
  rowConflicts,
  type GnomeBinding,
  type RowConflict,
} from './gnome-conflicts.ts';
import { gnomeKeybindingSettings, readGnomeKeybindings, removeFromGnome } from './gnome-keybindings.ts';
import { keyName } from './key-names.ts';
import {
  capsLockGroup,
  gnomeNoteGroup,
  resetAllButton,
  superKeyGroup,
  versionGroup,
  versionWarningGroup,
  type Watch,
} from './prefs-groups.ts';
import { findConflict, shortcutLayout, type ShortcutGroup } from './shortcuts.ts';

/** The space that the window leaves free above and below on the monitor. */
const monitorMargin = 80;

const defaultWidth = 1000;

/** The page clamps its content to 600 px. The grid needs more. */
const pageMaximumWidth = 1100;

export default class RektangelPreferences extends ExtensionPreferences {
  override fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const settings = this.getSettings();
    // The handlers on settings objects, disconnected when the window closes.
    const connections: { settings: Gio.Settings; id: number }[] = [];
    const watch: Watch = (watched, signal, handler) => {
      connections.push({ settings: watched, id: watched.connect(signal, handler) });
    };
    const page = new Adw.PreferencesPage({
      title: 'Shortcuts',
      icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
    });
    window.add(page);
    page.add(versionWarningGroup(this.dir, this.uuid));

    const gnomeSettings = gnomeKeybindingSettings();
    let gnomeTables = readGnomeKeybindings(gnomeSettings);
    const refreshers = new Map<Action, (conflicts: readonly RowConflict[]) => void>();
    const refreshAll = (): void => {
      const bindings = currentBindings(settings);
      const superKey = settings.get_string(superKeySetting) as SuperKey;
      refreshers.forEach((refresh, action) => refresh(rowConflicts(action, bindings, gnomeTables, superKey)));
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

    const groupWidget = (group: ShortcutGroup): Adw.PreferencesGroup => {
      const preferencesGroup = new Adw.PreferencesGroup({ title: group.title });
      for (const action of group.actions) {
        const { row, refresh } = shortcutRow(window, settings, action, removeConflict);
        refreshers.set(action, refresh);
        preferencesGroup.add(row);
      }
      return preferencesGroup;
    };
    // Cells align at the top, so the titles of the groups in a row are on one line.
    const grid = new Gtk.Grid({ column_spacing: 24, row_spacing: 24, column_homogeneous: true });
    const superKey = superKeyGroup(settings, this.path, watch);
    superKey.valign = Gtk.Align.START;
    grid.attach(superKey, 0, 0, 1, 1);
    const capsLock = capsLockGroup(settings, watch);
    capsLock.valign = Gtk.Align.START;
    grid.attach(capsLock, 1, 0, 1, 1);
    shortcutLayout.forEach((cells, row) =>
      cells.forEach((groups, column) => {
        const cell = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 24, valign: Gtk.Align.START });
        groups.forEach((group) => cell.append(groupWidget(group)));
        // The bottom right cell, with the Other group, also has the reset button.
        if (row === shortcutLayout.length - 1 && column === cells.length - 1) {
          cell.append(resetAllButton(window, settings));
        }
        grid.attach(cell, column, row + 1, 1, 1);
      }),
    );
    const gridGroup = new Adw.PreferencesGroup();
    gridGroup.add(grid);
    page.add(gridGroup);
    page.add(gnomeNoteGroup());
    page.add(versionGroup(window, this.dir));
    refreshAll();

    // A change of one shortcut can add or remove a conflict on other rows.
    watch(settings, 'changed', refreshAll);
    gnomeSettings.forEach((gnome) => watch(gnome, 'changed', reloadGnome));
    window.connect('close-request', () => {
      connections.forEach(({ settings: watched, id }) => watched.disconnect(id));
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
  // window enters first. Only at the first realize, so that a second
  // realize does not connect enter-monitor again.
  const realizeId = window.connect('realize', () => {
    window.disconnect(realizeId);
    const first = window.get_display().get_monitors().get_item(0) as Gdk.Monitor | null;
    if (first !== null) {
      fit(first);
    }
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

/** The GNOME keys that can take the accelerator before Rektangel. */
function gnomeConflictsOf(settings: Gio.Settings, accelerator: string): GnomeBinding[] {
  const superKey = settings.get_string(superKeySetting) as SuperKey;
  return canConflictWithGnome(accelerator, superKey)
    ? findGnomeConflicts(accelerator, readGnomeKeybindings(), superKey)
    : [];
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
    const gnomeConflicts = conflicts.filter((conflict) => conflict.kind === 'gnome');
    for (const section of conflictSections(gnomeConflicts, (conflict) => acceleratorLabel(conflict.accelerator))) {
      box.append(label(section.explanation, ['dim-label']));
      for (const { binding, wording } of section.entries) {
        box.append(label(wording.entry, ['heading']));
        const remove = new Gtk.Button({ label: wording.button, halign: Gtk.Align.START });
        remove.connect('clicked', () => {
          popover.popdown();
          removeConflict(binding);
        });
        box.append(remove);
      }
    }
    for (const conflict of conflicts) {
      if (conflict.kind === 'rektangel') {
        box.append(label(`Also used by Rektangel: ${actionTitle(settings, conflict.action)}`, ['heading']));
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
  shortcut.connect('clicked', () => {
    const superKey = settings.get_string(superKeySetting) as SuperKey;
    presentCaptureDialog(window, {
      actionTitle: title,
      current: settings.get_strv(key)[0] ?? '',
      superKey,
      conflictOf: (accelerator) => {
        const other = findConflict(accelerator, action, currentBindings(settings), superKey);
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
    });
  });
  return { row, refresh };
}

function currentBindings(settings: Gio.Settings): Map<Action, readonly string[]> {
  return new Map(allActions.map((action) => [action, settings.get_strv(keyName(action))]));
}

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { allActions, isAction, type Action } from '@rektangel/core';
import { superKeySetting, type SuperKey } from './accelerator.ts';
import { ibusSwallowsSuperKeys, parseIbusVersion } from './ibus.ts';
import { acceleratorLabel, keyToUnicode } from './capture-dialog.ts';
import {
  canConflictWithGnome,
  conflictSections,
  customShortcutTable,
  findGnomeConflicts,
  ibusExplanationMarkup,
  ibusHeading,
  resolveAboveTab,
  rowConflicts,
  type KeybindingTables,
  type RowConflict,
} from './gnome-conflicts.ts';
import {
  customShortcutSettings,
  gnomeKeybindingSettings,
  readCustomShortcuts,
  readGnomeKeybindings,
  removeFromGnome,
} from './gnome-keybindings.ts';
import { keyName } from './key-names.ts';
import {
  capsLockGroup,
  gnomeNoteGroup,
  presentRowCaptureDialog,
  resetAllButton,
  superKeyGroup,
  versionGroup,
  versionWarningGroup,
  type RowContext,
  type Watch,
} from './prefs-groups.ts';
import { shortcutLayout, type ShortcutGroup } from './shortcuts.ts';

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
    // GTK 4 emits destroy only for windows, so the popovers of the badges
    // are unparented here. A popover that is still a child of a finalized
    // button gives a GTK warning.
    const cleanups: (() => void)[] = [];
    const onClose = (cleanup: () => void): void => {
      cleanups.push(cleanup);
    };
    const page = new Adw.PreferencesPage({
      title: 'Shortcuts',
      icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
    });
    window.add(page);
    page.add(versionWarningGroup(this.dir, this.uuid));

    const gnomeSettings = gnomeKeybindingSettings();
    let customSettings = customShortcutSettings();
    const aboveTab = aboveTabKeyName(window.get_display());
    const readTables = (): KeybindingTables =>
      resolveAboveTab(
        new Map([...readGnomeKeybindings(gnomeSettings), ...customShortcutTable(readCustomShortcuts(customSettings))]),
        aboveTab,
      );
    let gnomeTables = readTables();
    // Without the IBus fault, no key gives a character, so no row gets the IBus warning.
    const ibusKeyToUnicode = ibusSwallowsSuperKeys(installedIbusVersion(), ibusPackageVersion()) ? keyToUnicode : undefined;
    const refreshers = new Map<string, (conflicts: readonly RowConflict[]) => void>();
    const refreshAll = (): void => {
      const bindings = currentBindings(settings);
      const superKey = settings.get_string(superKeySetting) as SuperKey;
      refreshers.forEach((refresh, id) => refresh(rowConflicts(id, bindings, gnomeTables, superKey, ibusKeyToUnicode)));
    };
    const reloadGnome = (): void => {
      gnomeTables = readTables();
      refreshAll();
    };
    const removeConflict = (conflict: GnomeConflict): void => {
      try {
        removeFromGnome(conflict, conflict.accelerator, aboveTab);
      } catch (error) {
        window.add_toast(new Adw.Toast({ title: `Cannot remove the GNOME shortcut: ${error}`, timeout: 0 }));
      }
      reloadGnome();
    };
    const context: RowContext = {
      window,
      settings,
      titleOf: (id) => rowTitle(settings, id),
      bindings: () => currentBindings(settings),
      gnomeConflictsOf: (accelerator) => {
        const superKey = settings.get_string(superKeySetting) as SuperKey;
        return canConflictWithGnome(accelerator, superKey)
          ? findGnomeConflicts(accelerator, readTables(), superKey)
          : [];
      },
      removeFromGnome: (accelerator, bindings) =>
        bindings.forEach((binding) => removeFromGnome(binding, accelerator, aboveTab)),
      conflictBadge: () => conflictBadge(settings, removeConflict, onClose),
    };

    const groupWidget = (group: ShortcutGroup): Adw.PreferencesGroup => {
      const preferencesGroup = new Adw.PreferencesGroup({ title: group.title });
      for (const action of group.actions) {
        const { row, refresh } = shortcutRow(context, action);
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
    // The list of custom shortcuts is a key of media-keys, one of gnomeSettings.
    const watchCustom = (): void => customSettings.forEach((custom) => watch(custom, 'changed', reloadGnome));
    watchCustom();
    const mediaKeys = gnomeSettings.find((gnome) => gnome.settings_schema.has_key('custom-keybindings'));
    if (mediaKeys !== undefined) {
      watch(mediaKeys, 'changed::custom-keybindings', () => {
        customSettings = customShortcutSettings();
        watchCustom();
        reloadGnome();
      });
    }
    window.connect('close-request', () => {
      connections.forEach(({ settings: watched, id }) => watched.disconnect(id));
      cleanups.forEach((cleanup) => cleanup());
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

/** The title of a row for the conflict texts. */
function rowTitle(settings: Gio.Settings, id: string): string {
  return isAction(id) ? actionTitle(settings, id) : id;
}

/**
 * The key name of the key above Tab on the current layout, for example
 * "section" on a Finnish layout. GNOME calls this key Above_Tab. Keycode 49
 * is the XKB keycode of that key (TLDE).
 */
function aboveTabKeyName(display: Gdk.Display): string | null {
  const [found, keys, keyvals] = display.map_keycode(49);
  const index = found && keys !== null ? keys.findIndex((key) => key.group === 0 && key.level === 0) : -1;
  return index < 0 || keyvals === null ? null : Gdk.keyval_name(keyvals[index]!);
}

type GnomeConflict = Extract<RowConflict, { kind: 'gnome' }>;

/** The standard output of a command, or null when the command fails or prints nothing. */
function commandOutput(argv: string[]): string | null {
  try {
    const process = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
    const [, stdout] = process.communicate_utf8(null, null);
    const output = (stdout ?? '').trim();
    return output === '' ? null : output;
  } catch {
    return null;
  }
}

function installedIbusVersion() {
  const output = commandOutput(['ibus', 'version']);
  return output === null ? null : parseIbusVersion(output);
}

/** The Debian version of the IBus library, or null without dpkg or the package. */
function ibusPackageVersion(): string | null {
  return commandOutput(['dpkg-query', '--show', '--showformat=${Version}', 'libibus-1.0-5']);
}

/** One line of the badge text. A GNOME key has a button that removes the shortcut from it. */
interface ConflictLine {
  readonly text: string;
  readonly dim: boolean;
  /** True when the text is Pango markup, for example with a link. */
  readonly markup?: boolean;
  readonly button?: { readonly label: string; readonly onClick: () => void };
}

function conflictLines(
  settings: Gio.Settings,
  conflicts: readonly RowConflict[],
  removeConflict: (conflict: GnomeConflict) => void,
): ConflictLine[] {
  const lines: ConflictLine[] = [];
  const gnomeConflicts = conflicts.filter((conflict) => conflict.kind === 'gnome');
  for (const section of conflictSections(gnomeConflicts, (conflict) => acceleratorLabel(conflict.accelerator))) {
    lines.push({ text: section.explanation, dim: true });
    for (const { binding, wording } of section.entries) {
      const button =
        wording.button === null ? undefined : { label: wording.button, onClick: () => removeConflict(binding) };
      lines.push({ text: wording.entry, dim: false, button });
    }
  }
  for (const conflict of conflicts) {
    if (conflict.kind === 'ibus') {
      lines.push({ text: ibusHeading(conflict.character), dim: false });
      lines.push({ text: ibusExplanationMarkup, dim: true, markup: true });
    }
  }
  for (const conflict of conflicts) {
    if (conflict.kind === 'rektangel') {
      lines.push({ text: `Also used by Rektangel: ${rowTitle(settings, conflict.id)}`, dim: false });
    }
  }
  return lines;
}

const popoverCss = `
.rektangel-conflicts > contents { background-color: black; color: white; }
.rektangel-conflicts > arrow { background-color: black; }
.rektangel-conflicts .dim-label { color: #c8c8c8; opacity: 1; }
.rektangel-conflicts label > link { color: #99c1f1; }
`;
let popoverCssAdded = false;

/** Adds the popover style to the display one time. */
function addPopoverCss(display: Gdk.Display): void {
  if (popoverCssAdded) {
    return;
  }
  const provider = new Gtk.CssProvider();
  provider.load_from_string(popoverCss);
  Gtk.StyleContext.add_provider_for_display(display, provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
  popoverCssAdded = true;
}

/** The time that the pointer can be between the badge and its popover. */
const popoverGraceMs = 200;

/**
 * A red warning button that is visible when the row has conflicts. Hover
 * and click open the same popover, which lists the conflicts with a
 * button for each GNOME key. The popover closes when the pointer leaves
 * the badge and the popover.
 */
function conflictBadge(
  settings: Gio.Settings,
  removeConflict: (conflict: GnomeConflict) => void,
  onClose: (cleanup: () => void) => void,
): { badge: Gtk.Button; show: (conflicts: readonly RowConflict[]) => void } {
  const badge = new Gtk.Button({
    icon_name: 'dialog-warning-symbolic',
    valign: Gtk.Align.CENTER,
    css_classes: ['flat', 'error'],
  });
  // autohide false: a popover that opened on hover must not take the focus.
  const popover = new Gtk.Popover({ css_classes: ['rektangel-conflicts'], autohide: false });
  popover.set_parent(badge);
  addPopoverCss(badge.get_display());

  let insideBadge = false;
  let insidePopover = false;
  let closeTimer = 0;
  const closeWhenOutside = (): void => {
    if (closeTimer !== 0) {
      GLib.source_remove(closeTimer);
    }
    closeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, popoverGraceMs, () => {
      closeTimer = 0;
      if (!insideBadge && !insidePopover) {
        popover.popdown();
      }
      return GLib.SOURCE_REMOVE;
    });
  };
  const badgeMotion = new Gtk.EventControllerMotion();
  badgeMotion.connect('enter', () => {
    insideBadge = true;
    popover.popup();
  });
  badgeMotion.connect('leave', () => {
    insideBadge = false;
    closeWhenOutside();
  });
  badge.add_controller(badgeMotion);
  const popoverMotion = new Gtk.EventControllerMotion();
  popoverMotion.connect('enter', () => {
    insidePopover = true;
  });
  popoverMotion.connect('leave', () => {
    insidePopover = false;
    closeWhenOutside();
  });
  popover.add_controller(popoverMotion);
  badge.connect('clicked', () => (popover.visible ? popover.popdown() : popover.popup()));
  onClose(() => {
    if (closeTimer !== 0) {
      GLib.source_remove(closeTimer);
    }
    popover.unparent();
  });

  const show = (conflicts: readonly RowConflict[]): void => {
    const lines = conflictLines(settings, conflicts, removeConflict);
    badge.visible = lines.length > 0;
    const box = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 6,
      margin_top: 6,
      margin_bottom: 6,
      margin_start: 6,
      margin_end: 6,
    });
    for (const line of lines) {
      const label = new Gtk.Label({
        label: line.text,
        use_markup: line.markup ?? false,
        wrap: true,
        max_width_chars: 40,
        xalign: 0,
      });
      label.css_classes = line.dim ? ['dim-label'] : ['heading'];
      box.append(label);
      if (line.button !== undefined) {
        const { label: text, onClick } = line.button;
        const button = new Gtk.Button({ label: text, halign: Gtk.Align.START });
        button.connect('clicked', () => {
          popover.popdown();
          onClick();
        });
        box.append(button);
      }
    }
    popover.child = box;
  };
  return { badge, show };
}

function shortcutRow(
  context: RowContext,
  action: Action,
): { row: Adw.ActionRow; refresh: (conflicts: readonly RowConflict[]) => void } {
  const { settings } = context;
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
  const { badge, show } = context.conflictBadge();
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
    presentRowCaptureDialog(context, {
      id: action,
      title,
      current: settings.get_strv(key)[0] ?? '',
      plainKey: false,
      onSave: (accelerator) => settings.set_strv(key, accelerator === '' ? [] : [accelerator]),
    }),
  );
  return { row, refresh };
}

/** The accelerators of all rows, keyed by row id. */
function currentBindings(settings: Gio.Settings): Map<string, readonly string[]> {
  return new Map(allActions.map((action) => [action, settings.get_strv(keyName(action))]));
}

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import {
  appTogglesSetting,
  desktopIdCandidates,
  isValidAppId,
  parseAppToggles,
  serializeAppToggles,
  type AppToggle,
} from './app-toggles.ts';
import { acceleratorLabel } from './capture-dialog.ts';
import type { RowConflict } from './gnome-conflicts.ts';
import { presentRowCaptureDialog, type RowContext, type Watch } from './prefs-groups.ts';

/** The row id of an entry, unique in the preferences window. */
export function appRowId(index: number): string {
  return `app:${index}`;
}

export function readAppToggles(settings: Gio.Settings): AppToggle[] {
  return parseAppToggles(settings.get_value(appTogglesSetting).deepUnpack() as [string, string][]);
}

function writeAppToggles(settings: Gio.Settings, entries: readonly AppToggle[]): void {
  settings.set_value(appTogglesSetting, new GLib.Variant('a(ss)', serializeAppToggles(entries)));
}

/** The accelerators of the entries, keyed by row id. */
export function appBindings(settings: Gio.Settings): [string, readonly string[]][] {
  return readAppToggles(settings).map(({ accelerator }, index) => [
    appRowId(index),
    accelerator === '' ? [] : [accelerator],
  ]);
}

/** The desktop file of the app, or null for a window class or an unknown app. */
function appInfo(app: string): Gio.DesktopAppInfo | null {
  if (!isValidAppId(app)) {
    return null;
  }
  for (const id of desktopIdCandidates(app)) {
    const info = Gio.DesktopAppInfo.new(id) as Gio.DesktopAppInfo | null;
    if (info !== null) {
      return info;
    }
  }
  return null;
}

/** The name of the app for the user: the name in its desktop file, or the identifier. */
export function appName(app: string): string {
  return appInfo(app)?.get_name() ?? app;
}

/** The title of an entry for the conflict texts, or null for an id that is not an entry. */
export function appRowTitle(settings: Gio.Settings, id: string): string | null {
  const match = /^app:(\d+)$/.exec(id);
  const entry = match === null ? undefined : readAppToggles(settings)[Number(match[1])];
  return entry === undefined ? null : `Show or hide ${appName(entry.app)}`;
}

const identifierHint =
  'The identifier is the name of the .desktop file of the app without .desktop, for example ' +
  'org.gnome.TextEditor or firefox_firefox. The files are in /usr/share/applications and ' +
  '~/.local/share/applications. For Flatpak apps, run: flatpak list --app --columns=application. ' +
  'Looking Glass (Alt+F2, lg, Windows) shows the app and the window class of each window. ' +
  'The window class also works.';

/**
 * The group of the app-toggles entries: one row for each entry, and a
 * button that adds an entry. `refreshers` gets the conflict refresher of
 * each row, keyed by row id. The rows are made again when the list changes.
 */
export function appTogglesGroup(
  context: RowContext,
  watch: Watch,
  refreshers: Map<string, (conflicts: readonly RowConflict[]) => void>,
  refreshAll: () => void,
): Adw.PreferencesGroup {
  const { settings } = context;
  const group = new Adw.PreferencesGroup({
    title: 'Show or Hide App Windows',
    description:
      'A shortcut hides all windows of the app when the app has the focus, and brings them to the front when it ' +
      'does not. It starts the app when the app has no window. The shortcut can be one key without a modifier, ' +
      'for example §.',
  });
  const add = new Gtk.Button({
    child: new Adw.ButtonContent({ icon_name: 'list-add-symbolic', label: 'Add App' }),
    valign: Gtk.Align.CENTER,
    css_classes: ['flat'],
  });
  group.header_suffix = add;
  add.connect('clicked', () =>
    presentAddDialog(context.window, (app) =>
      writeAppToggles(settings, [...readAppToggles(settings), { app, accelerator: '' }]),
    ),
  );

  let rows: Adw.ActionRow[] = [];
  const empty = new Adw.ActionRow({ title: 'No apps', subtitle: 'Click Add App to add one.', activatable: false });
  const rebuild = (): void => {
    rows.forEach((row) => group.remove(row));
    if (empty.get_parent() !== null) {
      group.remove(empty);
    }
    for (const id of [...refreshers.keys()].filter((key) => key.startsWith('app:'))) {
      refreshers.delete(id);
    }
    const entries = readAppToggles(settings);
    rows = entries.map((entry, index) => {
      const { row, refresh } = appRow(context, entries, index);
      refreshers.set(appRowId(index), refresh);
      group.add(row);
      return row;
    });
    if (entries.length === 0) {
      group.add(empty);
    }
  };
  rebuild();
  watch(settings, `changed::${appTogglesSetting}`, () => {
    rebuild();
    refreshAll();
  });
  return group;
}

function appRow(
  context: RowContext,
  entries: readonly AppToggle[],
  index: number,
): { row: Adw.ActionRow; refresh: (conflicts: readonly RowConflict[]) => void } {
  const { settings } = context;
  const entry = entries[index]!;
  const info = appInfo(entry.app);
  const row = new Adw.ActionRow({
    title: GLib.markup_escape_text(info?.get_name() ?? entry.app, -1),
    subtitle: GLib.markup_escape_text(entry.app, -1),
    activatable: false,
  });
  const icon = info?.get_icon();
  row.add_prefix(
    new Gtk.Image({
      ...(icon ? { gicon: icon } : { icon_name: 'application-x-executable-symbolic' }),
      pixel_size: 32,
    }),
  );
  const label = new Gtk.Label();
  const shortcut = new Gtk.Button({ child: label, valign: Gtk.Align.CENTER, tooltip_text: 'Set Shortcut' });
  const remove = new Gtk.Button({
    icon_name: 'user-trash-symbolic',
    tooltip_text: 'Remove',
    valign: Gtk.Align.CENTER,
    css_classes: ['flat'],
  });
  const { badge, show } = context.conflictBadge();
  row.add_suffix(badge);
  row.add_suffix(shortcut);
  row.add_suffix(remove);

  const isEmpty = entry.accelerator === '';
  label.label = isEmpty ? 'Set shortcut…' : acceleratorLabel(entry.accelerator);
  label.css_classes = isEmpty ? ['dim-label'] : ['keycap'];

  const title = `Show or hide ${info?.get_name() ?? entry.app}`;
  shortcut.connect('clicked', () =>
    presentRowCaptureDialog(context, {
      id: appRowId(index),
      title,
      current: entry.accelerator,
      plainKey: true,
      onSave: (accelerator) =>
        writeAppToggles(
          settings,
          entries.map((other, otherIndex) => (otherIndex === index ? { ...other, accelerator } : other)),
        ),
    }),
  );
  remove.connect('clicked', () =>
    writeAppToggles(
      settings,
      entries.filter((_, otherIndex) => otherIndex !== index),
    ),
  );
  return { row, refresh: show };
}

/**
 * Asks for the identifier of the app. `onAdd` gets a valid identifier.
 */
function presentAddDialog(parent: Gtk.Widget, onAdd: (app: string) => void): void {
  const entry = new Gtk.Entry({ placeholder_text: 'For example org.gnome.TextEditor', activates_default: true });
  const problem = new Gtk.Label({ wrap: true, xalign: 0, css_classes: ['error'], visible: false });
  const hint = new Gtk.Label({ label: identifierHint, wrap: true, xalign: 0, css_classes: ['dim-label'] });
  const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 });
  [entry, problem, hint].forEach((widget) => content.append(widget));

  const dialog = new Adw.AlertDialog({
    heading: 'Add App',
    body: 'Type the identifier of the app.',
    extra_child: content,
    close_response: 'cancel',
    default_response: 'add',
  });
  dialog.add_response('cancel', 'Cancel');
  dialog.add_response('add', 'Add');
  dialog.set_response_appearance('add', Adw.ResponseAppearance.SUGGESTED);
  dialog.set_response_enabled('add', false);

  const check = (): void => {
    const app = entry.text.trim();
    const isValid = isValidAppId(app);
    problem.label = 'Use letters, digits, spaces and the characters . _ - + @ ~, and start with a letter or a digit.';
    problem.visible = app !== '' && !isValid;
    dialog.set_response_enabled('add', isValid);
  };
  entry.connect('changed', check);
  dialog.connect('response', (_dialog, response) => {
    const app = entry.text.trim();
    if (response === 'add' && isValidAppId(app)) {
      onAdd(app);
    }
  });
  dialog.present(parent);
  entry.grab_focus();
}

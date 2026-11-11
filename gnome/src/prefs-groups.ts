import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import { allActions } from '@rektangel/core';
import { capsLockBehaviorSetting, superKeySetting, xkbOptionInstalledSetting, type SuperKey } from './accelerator.ts';
import { capsLockBehavior, installXkbOption, removeXkbOption } from './capslock-mode.ts';
import { acceleratorLabel, presentCaptureDialog } from './capture-dialog.ts';
import type { GnomeBinding, RowConflict } from './gnome-conflicts.ts';
import { keyName } from './key-names.ts';
import { findConflict } from './shortcuts.ts';
import { versionLabel, versionMismatchWarning } from './version.ts';
import { capsLockModeProblem } from './xkb-merge.ts';

const superKeyChoices = [
  { value: 'capslock', label: 'Caps Lock' },
  { value: 'super', label: 'Windows key' },
] as const;

const capsLockChoices = [
  {
    value: 'both-shifts',
    label: 'Both Shift keys',
    note: 'Caps Lock is always Hyper. To toggle caps lock, press both Shift keys at once.',
  },
  {
    value: 'shift-caps',
    label: 'Shift+Caps Lock',
    note:
      'Shift+Caps Lock toggles caps lock. Disadvantage: when you press Shift before Caps Lock, ' +
      'you get caps lock and not Hyper. This can occur when you use Hyper and Shift quickly.',
  },
  {
    value: 'hyper-only',
    label: 'Off',
    note: 'Caps Lock is always Hyper. Caps lock is not available.',
  },
] as const;

/** Connects a handler that the preferences window disconnects when it closes. */
export type Watch = (settings: Gio.Settings, signal: string, handler: () => void) => void;

/** What a shortcut row of the preferences window needs from the window. */
export interface RowContext {
  readonly window: Adw.PreferencesWindow;
  readonly settings: Gio.Settings;
  /** The title of a row for the conflict texts. */
  readonly titleOf: (id: string) => string;
  /** The accelerators of all rows, keyed by row id. */
  readonly bindings: () => ReadonlyMap<string, readonly string[]>;
  /** The GNOME keys that can take the accelerator before Rektangel. */
  readonly gnomeConflictsOf: (accelerator: string) => GnomeBinding[];
  /** Removes the accelerator from these GNOME keys. Throws on failure. */
  readonly removeFromGnome: (accelerator: string, bindings: readonly GnomeBinding[]) => void;
  /** A red badge that lists the conflicts of the row. */
  readonly conflictBadge: () => { badge: Gtk.Button; show: (conflicts: readonly RowConflict[]) => void };
}

/**
 * Opens the capture dialog for the row and saves the new accelerator. A
 * toast tells the user when GNOME also uses the saved shortcut.
 */
export function presentRowCaptureDialog(
  context: RowContext,
  row: {
    readonly id: string;
    readonly title: string;
    readonly current: string;
    readonly plainKey: boolean;
    readonly onSave: (accelerator: string) => void;
  },
): void {
  const { window, settings } = context;
  const superKey = settings.get_string(superKeySetting) as SuperKey;
  presentCaptureDialog(window, {
    actionTitle: row.title,
    current: row.current,
    superKey,
    plainKey: row.plainKey,
    conflictOf: (accelerator) => {
      const other = findConflict(accelerator, row.id, context.bindings(), superKey);
      return other === null ? null : context.titleOf(other);
    },
    gnomeConflictsOf: context.gnomeConflictsOf,
    removeFromGnome: context.removeFromGnome,
    onSave: (accelerator) => {
      row.onSave(accelerator);
      if (context.gnomeConflictsOf(accelerator).length > 0) {
        window.add_toast(
          new Adw.Toast({
            title: `GNOME also uses ${acceleratorLabel(accelerator)}, so ${row.title} may not work.`,
            timeout: 0,
          }),
        );
      }
    },
  });
}

export function superKeyGroup(settings: Gio.Settings, extensionPath: string, watch: Watch): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({ title: 'Hyper key' });
  const row = new Adw.ComboRow({
    title: 'Hyper key',
    model: Gtk.StringList.new(superKeyChoices.map((choice) => choice.label)),
  });
  const storedNote = new Gtk.Label({
    label:
      'The default shortcuts use Hyper. Changing the Hyper key changes all of them at once. ' +
      'A shortcut that you set keeps the key that you pressed.',
    wrap: true,
    xalign: 0,
    margin_top: 12,
    css_classes: ['dim-label'],
  });
  const problemNote = new Gtk.Label({ wrap: true, xalign: 0, margin_top: 6, css_classes: ['error'], visible: false });
  const reinstall = new Gtk.Button({
    label: 'Install the Caps Lock option again',
    halign: Gtk.Align.START,
    margin_top: 6,
    visible: false,
  });
  const changeNote = new Gtk.Label({ wrap: true, xalign: 0, margin_top: 6, visible: false });
  [row, problemNote, reinstall, storedNote, changeNote].forEach((widget) => group.add(widget));

  const inputSources = new Gio.Settings({ schema_id: 'org.gnome.desktop.input-sources' });
  const sessionType = GLib.getenv('XDG_SESSION_TYPE');
  const sync = (): void => {
    const superKey = settings.get_string('super-key');
    const isCapsLock = superKey === 'capslock';
    group.description = isCapsLock
      ? 'Hyper is Caps Lock. Hold it like a modifier.'
      : 'Hyper is the Windows key (GNOME calls it Super; Cmd on a Mac keyboard).';
    row.selected = superKeyChoices.findIndex((choice) => choice.value === superKey);
    const problem = isCapsLock
      ? capsLockModeProblem({ xkbOptions: inputSources.get_strv('xkb-options'), sessionType })
      : null;
    problemNote.label = `Caps Lock mode is not active: ${problem}. Hyper shortcuts use the Windows key until this is fixed.`;
    problemNote.visible = problem !== null;
    reinstall.visible = problem !== null && sessionType !== 'x11';
  };
  sync();
  watch(settings, 'changed::super-key', sync);
  watch(inputSources, 'changed::xkb-options', sync);

  const showNote = (text: string, isError: boolean): void => {
    changeNote.label = text;
    changeNote.css_classes = isError ? ['error'] : [];
    changeNote.visible = true;
  };
  reinstall.connect('clicked', () => {
    try {
      installXkbOption(extensionPath, capsLockBehavior(settings));
      settings.set_boolean(xkbOptionInstalledSetting, true);
    } catch (error) {
      showNote(`Cannot install the Caps Lock option: ${error}`, true);
    }
  });
  row.connect('notify::selected', () => {
    const value = superKeyChoices[row.selected]?.value;
    if (value === undefined || value === settings.get_string('super-key')) {
      return;
    }
    try {
      if (value === 'capslock') {
        installXkbOption(extensionPath, capsLockBehavior(settings));
        settings.set_boolean(xkbOptionInstalledSetting, true);
        showNote('Caps Lock is Hyper now, usually at once, at the latest after you log out and in.', false);
      } else {
        removeXkbOption();
        settings.set_boolean(xkbOptionInstalledSetting, false);
        showNote('Caps Lock is a normal key again, usually at once, at the latest after you log out and in.', false);
      }
      settings.set_string('super-key', value);
    } catch (error) {
      showNote(`Cannot change the Hyper key: ${error}`, true);
      sync();
    }
  });
  return group;
}

/**
 * The Caps Lock behavior dropdown. It is active only when Caps Lock is the
 * Hyper key. The extension changes the XKB option when the setting changes.
 */
export function capsLockGroup(settings: Gio.Settings, watch: Watch): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({ title: 'Caps Lock' });
  const row = new Adw.ComboRow({
    title: 'Toggle caps lock with',
    model: Gtk.StringList.new(capsLockChoices.map((choice) => choice.label)),
  });
  const note = new Gtk.Label({ wrap: true, xalign: 0, margin_top: 12, css_classes: ['dim-label'] });
  group.add(row);
  group.add(note);

  const sync = (): void => {
    const index = capsLockChoices.findIndex((choice) => choice.value === settings.get_string(capsLockBehaviorSetting));
    row.selected = index;
    note.label = capsLockChoices[index]?.note ?? '';
    const isCapsLock = settings.get_string(superKeySetting) === 'capslock';
    row.sensitive = isCapsLock;
    note.sensitive = isCapsLock;
    // Always a description, so that the title is on one line with the Hyper key title.
    group.description = isCapsLock
      ? 'How to toggle caps lock in Caps Lock mode.'
      : 'Select Caps Lock as the Hyper key to use this setting.';
  };
  sync();
  watch(settings, `changed::${capsLockBehaviorSetting}`, sync);
  watch(settings, `changed::${superKeySetting}`, sync);
  row.connect('notify::selected', () => {
    const value = capsLockChoices[row.selected]?.value;
    if (value !== undefined && value !== settings.get_string(capsLockBehaviorSetting)) {
      settings.set_string(capsLockBehaviorSetting, value);
    }
  });
  return group;
}

export function resetAllButton(window: Adw.PreferencesWindow, settings: Gio.Settings): Gtk.Button {
  const resetAll = new Gtk.Button({ label: 'Reset to defaults', halign: Gtk.Align.END, valign: Gtk.Align.START });
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
  return resetAll;
}

export function gnomeNoteGroup(): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({ title: 'Keyboard Shortcuts in Use by GNOME' });
  group.add(
    new Gtk.Label({
      label: 'GNOME has its own shortcuts. To see the GNOME shortcuts, open Settings > Keyboard > View and Customize Shortcuts.',
      wrap: true,
      xalign: 0,
    }),
  );
  return group;
}

/** The version-name of the metadata.json on disk, the code of this window. */
export function installedVersionName(dir: Gio.File): string | undefined {
  const [, bytes] = dir.get_child('metadata.json').load_contents(null);
  return (JSON.parse(new TextDecoder().decode(bytes)) as { 'version-name'?: string })['version-name'];
}

/** ExtensionState.ACTIVE of GNOME Shell 46. */
const activeState = 1;

/**
 * The version-name of the extension code that GNOME Shell runs, from the
 * metadata that the shell read when it loaded the code. Undefined when the
 * extension does not run or the shell does not answer.
 */
function runningVersionName(uuid: string): string | undefined {
  try {
    const reply = Gio.DBus.session.call_sync(
      'org.gnome.Shell.Extensions',
      '/org/gnome/Shell/Extensions',
      'org.gnome.Shell.Extensions',
      'GetExtensionInfo',
      new GLib.Variant('(s)', [uuid]),
      new GLib.VariantType('(a{sv})'),
      Gio.DBusCallFlags.NONE,
      1000,
      null,
    );
    const [info] = reply.recursiveUnpack() as [Record<string, unknown>];
    const versionName = info['version-name'];
    return info.state === activeState && typeof versionName === 'string' ? versionName : undefined;
  } catch (error) {
    console.warn('Rektangel: cannot get the running version from GNOME Shell', error);
    return undefined;
  }
}

/**
 * A warning at the top of the window when GNOME Shell runs another version
 * of the extension than the installed one. Not visible when they are the same.
 */
export function versionWarningGroup(dir: Gio.File, uuid: string): Adw.PreferencesGroup {
  const warning = versionMismatchWarning(installedVersionName(dir), runningVersionName(uuid));
  const group = new Adw.PreferencesGroup({ visible: warning !== null });
  const card = new Gtk.Box({ css_classes: ['card'] });
  const content = new Gtk.Box({ spacing: 12, margin_top: 12, margin_bottom: 12, margin_start: 12, margin_end: 12 });
  content.append(
    new Gtk.Image({ icon_name: 'dialog-warning-symbolic', valign: Gtk.Align.START, css_classes: ['warning'] }),
  );
  content.append(new Gtk.Label({ label: warning ?? '', wrap: true, xalign: 0, hexpand: true, css_classes: ['warning'] }));
  card.append(content);
  group.add(card);
  return group;
}

let versionCss: Gtk.CssProvider | undefined;

/**
 * The version line at the bottom of the window, at 75 percent of the font size.
 * The version comes from the installed metadata.json. The metadata that the
 * shell gives the preferences process is the one that it read at login, so
 * a new install would show the old version until the next login.
 */
export function versionGroup(window: Adw.PreferencesWindow, dir: Gio.File): Adw.PreferencesGroup {
  if (versionCss === undefined) {
    versionCss = new Gtk.CssProvider();
    versionCss.load_from_string('.rektangel-version { font-size: 75%; }');
  }
  Gtk.StyleContext.add_provider_for_display(window.get_display(), versionCss, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
  const group = new Adw.PreferencesGroup();
  group.add(
    new Gtk.Label({
      label: versionLabel(installedVersionName(dir)),
      halign: Gtk.Align.CENTER,
      css_classes: ['dim-label', 'rektangel-version'],
    }),
  );
  return group;
}

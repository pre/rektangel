import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import { allActions } from '@rektangel/core';
import { xkbOptionInstalledSetting } from './accelerator.ts';
import { installXkbOption, removeXkbOption } from './capslock-mode.ts';
import { keyName } from './key-names.ts';
import { capsLockModeProblem } from './xkb-merge.ts';

const superKeyChoices = [
  { value: 'capslock', label: 'Caps Lock' },
  { value: 'super', label: 'Windows key' },
] as const;

/** Connects a handler that the preferences window disconnects when it closes. */
export type Watch = (settings: Gio.Settings, signal: string, handler: () => void) => void;

export function superKeyGroup(settings: Gio.Settings, extensionPath: string, watch: Watch): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({ title: 'Super Key' });
  const row = new Adw.ComboRow({
    title: 'Super key',
    model: Gtk.StringList.new(superKeyChoices.map((choice) => choice.label)),
  });
  const storedNote = new Gtk.Label({
    label: 'Shortcuts below are stored with Super. Changing the Super key changes all of them at once.',
    wrap: true,
    xalign: 0,
    margin_top: 12,
    css_classes: ['dim-label'],
  });
  const capsLockNote = new Gtk.Label({
    label: 'Shift+Caps Lock still toggles the native caps lock.',
    wrap: true,
    xalign: 0,
    margin_top: 6,
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
  [row, capsLockNote, problemNote, reinstall, storedNote, changeNote].forEach((widget) => group.add(widget));

  const inputSources = new Gio.Settings({ schema_id: 'org.gnome.desktop.input-sources' });
  const sessionType = GLib.getenv('XDG_SESSION_TYPE');
  const sync = (): void => {
    const superKey = settings.get_string('super-key');
    const isCapsLock = superKey === 'capslock';
    group.description = isCapsLock
      ? 'Super is Caps Lock. Hold it like a modifier; Shift+Caps Lock toggles caps lock.'
      : 'Super is the Windows key (the key with the Windows logo, Cmd on a Mac keyboard).';
    capsLockNote.visible = isCapsLock;
    row.selected = superKeyChoices.findIndex((choice) => choice.value === superKey);
    const problem = isCapsLock
      ? capsLockModeProblem({ xkbOptions: inputSources.get_strv('xkb-options'), sessionType })
      : null;
    problemNote.label = `Caps Lock mode is not active: ${problem}. Shortcuts use the Windows key until this is fixed.`;
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
      installXkbOption(extensionPath);
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
        installXkbOption(extensionPath);
        settings.set_boolean(xkbOptionInstalledSetting, true);
        showNote('Caps Lock is Super now, usually at once, at the latest after you log out and in.', false);
      } else {
        removeXkbOption();
        settings.set_boolean(xkbOptionInstalledSetting, false);
        showNote('Caps Lock is a normal key again, usually at once, at the latest after you log out and in.', false);
      }
      settings.set_string('super-key', value);
    } catch (error) {
      showNote(`Cannot change the Super key: ${error}`, true);
      sync();
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

export function gnomeNoteGroup(scriptPath: string, settings: Gio.Settings, watch: Watch): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({ title: 'Keyboard Shortcuts in Use by GNOME' });
  const text = new Gtk.Label({ wrap: true, xalign: 0 });
  const sync = (): void => {
    const intro =
      settings.get_string('super-key') === 'capslock'
        ? 'GNOME has its own shortcuts. With Caps Lock as Super, only Rektangel shortcuts without Super can use the same keys as GNOME. '
        : 'GNOME has its own shortcuts, and some of them use the same keys as the Rektangel defaults. ';
    text.label =
      intro +
      'When you set a shortcut that GNOME uses, the dialog tells you and can remove it from GNOME. ' +
      'To remove all the GNOME shortcuts that conflict with the Rektangel shortcuts, run this script in a terminal ' +
      '(add --dry-run to see the changes first):';
  };
  sync();
  watch(settings, 'changed::super-key', sync);
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

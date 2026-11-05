import Adw from 'gi://Adw';
import type Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import { allActions } from '@rektangel/core';
import { installXkbOption, removeXkbOption } from './capslock-mode.ts';
import { keyName } from './key-names.ts';

const superKeyChoices = ['super', 'capslock'] as const;

export function superKeyGroup(settings: Gio.Settings, extensionDir: Gio.File): Adw.PreferencesGroup {
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
  const capsLockNote = new Gtk.Label({
    label: 'Shift+Caps Lock still toggles the native caps lock.',
    wrap: true,
    xalign: 0,
    margin_top: 6,
    css_classes: ['dim-label'],
  });
  const changeNote = new Gtk.Label({ wrap: true, xalign: 0, margin_top: 6, visible: false });
  [row, capsLockNote, storedNote, changeNote].forEach((widget) => group.add(widget));

  const sync = (): void => {
    const isCapsLock = settings.get_string('super-key') === 'capslock';
    group.description = isCapsLock
      ? 'Super is Caps Lock. Hold it like a modifier; Shift+Caps Lock toggles caps lock.'
      : 'Super is the Windows key (the key with the Windows logo, Cmd on a Mac keyboard).';
    capsLockNote.visible = isCapsLock;
    row.selected = isCapsLock ? 1 : 0;
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
        showNote('Caps Lock is Super now, usually at once, at the latest after you log out and in.', false);
      } else {
        removeXkbOption(extensionDir.get_path() ?? "");
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

export function gnomeNoteGroup(scriptPath: string): Adw.PreferencesGroup {
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

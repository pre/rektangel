import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import { allActions } from '@rektangel/core';
import { xkbOptionInstalledSetting } from './accelerator.ts';
import { installXkbOption, removeXkbOption } from './capslock-mode.ts';
import { keyName } from './key-names.ts';
import { versionLabel } from './version.ts';
import { capsLockModeProblem } from './xkb-merge.ts';

const superKeyChoices = [
  { value: 'capslock', label: 'Caps Lock' },
  { value: 'super', label: 'Windows key' },
] as const;

/** Connects a handler that the preferences window disconnects when it closes. */
export type Watch = (settings: Gio.Settings, signal: string, handler: () => void) => void;

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
      ? 'Hyper is Caps Lock. Hold it like a modifier; Shift+Caps Lock toggles caps lock.'
      : 'Hyper is the Windows key (GNOME calls it Super; Cmd on a Mac keyboard).';
    capsLockNote.visible = isCapsLock;
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

let versionCss: Gtk.CssProvider | undefined;

/**
 * The version line at the bottom of the window, at 75 percent of the font size.
 * The version comes from the installed metadata.json. The metadata that the
 * shell gives the preferences process is the one that it read at login, so
 * a new install would show the old version until the next login.
 */
export function versionGroup(window: Adw.PreferencesWindow, dir: Gio.File): Adw.PreferencesGroup {
  const [, bytes] = dir.get_child('metadata.json').load_contents(null);
  const metadata = JSON.parse(new TextDecoder().decode(bytes)) as { 'version-name'?: string };
  if (versionCss === undefined) {
    versionCss = new Gtk.CssProvider();
    versionCss.load_from_string('.rektangel-version { font-size: 75%; }');
  }
  Gtk.StyleContext.add_provider_for_display(window.get_display(), versionCss, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
  const group = new Adw.PreferencesGroup();
  group.add(
    new Gtk.Label({
      label: versionLabel(metadata['version-name']),
      halign: Gtk.Align.CENTER,
      css_classes: ['dim-label', 'rektangel-version'],
    }),
  );
  return group;
}

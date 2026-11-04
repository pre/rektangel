import Adw from 'gi://Adw';
import type Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { allActions, type Action } from '@rektangel/core';
import { acceleratorLabel, presentCaptureDialog } from './capture-dialog.ts';
import { keyName } from './key-names.ts';
import { findConflict, shortcutGroups } from './shortcuts.ts';

export default class RektangelPreferences extends ExtensionPreferences {
  override fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const settings = this.getSettings();
    const page = new Adw.PreferencesPage({
      title: 'Shortcuts',
      icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
    });
    window.add(page);

    page.add(headerGroup(window, settings));
    const refreshers = new Map<string, () => void>();
    for (const group of shortcutGroups) {
      const preferencesGroup = new Adw.PreferencesGroup({ title: group.title });
      for (const action of group.actions) {
        const { row, refresh } = shortcutRow(window, settings, action);
        refreshers.set(keyName(action), refresh);
        preferencesGroup.add(row);
      }
      page.add(preferencesGroup);
    }
    page.add(gnomeNoteGroup(`${this.path}/gnome-keys.sh`));

    settings.connect('changed', (_settings, key) => refreshers.get(key)?.());
  }
}

function actionTitle(settings: Gio.Settings, action: Action): string {
  return settings.settings_schema.get_key(keyName(action)).get_summary() ?? action;
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

function shortcutRow(
  window: Adw.PreferencesWindow,
  settings: Gio.Settings,
  action: Action,
): { row: Adw.ActionRow; refresh: () => void } {
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
  row.add_suffix(label);
  row.add_suffix(reset);

  const refresh = (): void => {
    const accelerators = settings.get_strv(key);
    label.label = accelerators.length === 0 ? acceleratorLabel('') : accelerators.map(acceleratorLabel).join(', ');
    const defaultValue = settings.get_default_value(key);
    reset.visible = defaultValue !== null && !settings.get_value(key).equal(defaultValue);
  };
  refresh();

  reset.connect('clicked', () => settings.reset(key));
  row.connect('activated', () =>
    presentCaptureDialog(window, {
      actionTitle: title,
      current: settings.get_strv(key)[0] ?? '',
      conflictOf: (accelerator) => {
        const other = findConflict(accelerator, action, currentBindings(settings));
        return other === null ? null : actionTitle(settings, other);
      },
      onSave: (accelerator) => settings.set_strv(key, accelerator === '' ? [] : [accelerator]),
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
      'This window does not find these conflicts. ' +
      'To remove the conflicting GNOME shortcuts, run this script in a terminal (add --dry-run to see the changes first):',
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

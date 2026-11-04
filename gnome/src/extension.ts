import type Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { allActions, type Action } from '@rektangel/core';

export default class RektangelExtension extends Extension {
  private settings: Gio.Settings | null = null;

  override enable(): void {
    const settings = this.getSettings();
    this.settings = settings;
    for (const action of allActions) {
      Main.wm.addKeybinding(action, settings, Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL, () =>
        this.onAction(action),
      );
    }
  }

  override disable(): void {
    for (const action of allActions) {
      Main.wm.removeKeybinding(action);
    }
    this.settings = null;
  }

  private onAction(action: Action): void {
    console.log(`Rektangel: ${action}`);
  }
}

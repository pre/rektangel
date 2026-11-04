import { Action } from '@rektangel/core';

/**
 * The gsettings key of the action's keybinding. Mutter keeps all
 * keybinding names in one namespace, and its own "maximize" binding
 * makes Main.wm.addKeybinding('maximize', ...) fail.
 */
export function keyName(action: Action): string {
  return action === Action.Maximize ? 'maximize-window' : action;
}

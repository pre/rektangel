import type { Rect } from '@rektangel/core';
import { translateHyper, type SuperKey } from './accelerator.ts';
import { effectiveAccelerator } from './shortcuts.ts';

/** The gsettings key of the entries, type a(ss). See ADR 0017. */
export const appTogglesSetting = 'app-toggles';

/**
 * One entry of app-toggles: the shortcut shows or hides the windows of
 * the app. The accelerator has the stored form of ADR 0013, and it can be
 * a key without a modifier. An empty accelerator turns the entry off.
 */
export interface AppToggle {
  readonly app: string;
  readonly accelerator: string;
}

/** The entries of an unpacked a(ss) value, in the order of the list. */
export function parseAppToggles(value: readonly (readonly [string, string])[]): AppToggle[] {
  return value.map(([app, accelerator]) => ({ app, accelerator }));
}

/** The a(ss) value of the entries. */
export function serializeAppToggles(entries: readonly AppToggle[]): [string, string][] {
  return entries.map(({ app, accelerator }) => [app, accelerator]);
}

const maximumAppIdLength = 255;

/**
 * True for a desktop file name, a Flatpak or snap app id, or a window
 * class: letters, digits and . _ - + @ ~ and spaces, starting with a
 * letter or a digit. No path, no shell character.
 */
export function isValidAppId(app: string): boolean {
  return app.length <= maximumAppIdLength && /^[A-Za-z0-9][A-Za-z0-9._+@~ -]*$/.test(app);
}

const modifierTokens = new Set([
  'control',
  'ctrl',
  'ctl',
  'primary',
  'alt',
  'mod1',
  'super',
  'mod4',
  'shift',
  'shft',
  'meta',
  'hyper',
  'mod3',
]);

/** True for known modifier tokens followed by one key name. */
export function isValidAccelerator(accelerator: string): boolean {
  const match = /^((?:<[A-Za-z0-9]+>)*)([A-Za-z0-9_]+)$/.exec(accelerator);
  if (match === null) {
    return false;
  }
  const modifiers = match[1]!.match(/[A-Za-z0-9]+/g) ?? [];
  return modifiers.every((modifier) => modifierTokens.has(modifier.toLowerCase()));
}

/** The form to compare identifiers: lower case, without a .desktop suffix. */
export function appKey(app: string): string {
  return app.toLowerCase().replace(/\.desktop$/, '');
}

/** The identifiers of a window that an entry can use. */
export interface WindowIdentity {
  /** The id of the app of the window tracker, for example org.gnome.TextEditor.desktop. */
  readonly appId: string | null;
  readonly wmClass: string | null;
  readonly wmClassInstance: string | null;
  readonly gtkApplicationId: string | null;
  readonly sandboxedAppId: string | null;
}

export function windowMatchesApp(app: string, window: WindowIdentity): boolean {
  const wanted = appKey(app);
  return (
    wanted !== '' &&
    [window.appId, window.wmClass, window.wmClassInstance, window.gtkApplicationId, window.sandboxedAppId].some(
      (id) => id !== null && appKey(id) === wanted,
    )
  );
}

/** The desktop file ids to look up when the app has no window. */
export function desktopIdCandidates(app: string): string[] {
  return /\.desktop$/i.test(app) ? [app] : [app, `${app}.desktop`];
}

/**
 * The identifier for a window that the user clicked: the desktop file
 * name without the suffix, or the window class when the app has no
 * desktop file.
 */
export function pickedIdentifier(window: {
  appId: string | null;
  hasDesktopFile: boolean;
  wmClass: string | null;
}): string {
  if (window.hasDesktopFile && window.appId !== null) {
    return window.appId.replace(/\.desktop$/i, '');
  }
  return window.wmClass ?? '';
}

/** The top window that has the point in its frame. `windows` is in stacking order, bottom to top. */
export function topWindowAt<T>(windows: readonly { id: T; frame: Rect }[], x: number, y: number): T | null {
  for (let index = windows.length - 1; index >= 0; index--) {
    const { id, frame } = windows[index]!;
    if (x >= frame.x && x < frame.x + frame.width && y >= frame.y && y < frame.y + frame.height) {
      return id;
    }
  }
  return null;
}

/** The accelerators to give Mutter, and one journal line for each entry that does not get its shortcut. */
export interface GrabPlan {
  readonly grabs: readonly { readonly index: number; readonly accelerator: string }[];
  readonly problems: readonly string[];
}

/**
 * The accelerators of the entries, with <Hyper> translated. One
 * combination has one owner: first the actions, then the entries in list
 * order. `actions` maps the keybinding key of each action to its
 * accelerators, in allActions order.
 */
export function planGrabs(
  entries: readonly AppToggle[],
  actions: ReadonlyMap<string, readonly string[]>,
  superKey: SuperKey,
): GrabPlan {
  const owners = new Map<string, string>();
  for (const [key, accelerators] of actions) {
    for (const accelerator of accelerators) {
      const effective = effectiveAccelerator(accelerator, superKey);
      if (effective !== '' && !owners.has(effective)) {
        owners.set(effective, key);
      }
    }
  }
  const grabs: { index: number; accelerator: string }[] = [];
  const problems: string[] = [];
  entries.forEach(({ app, accelerator }, index) => {
    if (accelerator === '') {
      return;
    }
    if (!isValidAppId(app)) {
      problems.push(`Rektangel: app toggle ${index + 1} has an identifier that is not valid, it is not registered`);
      return;
    }
    const name = `app ${app}`;
    if (!isValidAccelerator(accelerator)) {
      problems.push(
        `Rektangel: ${name} has the accelerator ${JSON.stringify(accelerator)} that is not valid, it is not registered`,
      );
      return;
    }
    const effective = effectiveAccelerator(accelerator, superKey);
    const owner = owners.get(effective);
    if (owner !== undefined) {
      problems.push(`Rektangel: ${name} and ${owner} are both ${effective}, ${name} is not registered`);
      return;
    }
    owners.set(effective, name);
    grabs.push({ index, accelerator: translateHyper(accelerator, superKey) });
  });
  return { grabs, problems };
}

/** A window of the app, as the toggle decision sees it. */
export interface ToggleWindow {
  readonly id: number;
  readonly minimized: boolean;
  readonly onActiveWorkspace: boolean;
  /** The time of the last user interaction with the window. */
  readonly userTime: number;
}

/** What a hide remembers for the next show. */
export interface RememberedWindows {
  /** The windows that the hide minimized, in stacking order. */
  readonly windows: readonly number[];
  readonly focusId: number | null;
}

export interface ToggleInput {
  /** The windows of the app, in stacking order, bottom to top. */
  readonly windows: readonly ToggleWindow[];
  /** The window of the app that has the focus, or the parent of the focused dialog. Null when another app has the focus. */
  readonly focusId: number | null;
  readonly remembered: RememberedWindows | undefined;
}

export type ToggleDecision =
  | { readonly kind: 'start' }
  | { readonly kind: 'hide'; readonly minimize: readonly number[]; readonly remember: RememberedWindows }
  | {
      readonly kind: 'show';
      readonly unminimize: readonly number[];
      /** Bottom to top: the last window is on top. */
      readonly raise: readonly number[];
      readonly focusId: number;
    };

/**
 * What a key press does. No window: start the app. The app has the focus:
 * hide its windows. Else show them, as the hotkey window of iTerm2 does.
 * A show restores only the windows that the last hide minimized, so a
 * window that the user minimized stays minimized.
 */
export function toggleDecision({ windows, focusId, remembered }: ToggleInput): ToggleDecision {
  if (windows.length === 0) {
    return { kind: 'start' };
  }
  if (focusId !== null) {
    const minimize = windows.filter((window) => !window.minimized).map((window) => window.id);
    return { kind: 'hide', minimize, remember: { windows: minimize, focusId } };
  }

  const byId = new Map(windows.map((window) => [window.id, window]));
  const rememberedWindows = (remembered?.windows ?? []).filter((id) => byId.has(id));
  const restoreAll = rememberedWindows.length === 0 && windows.every((window) => window.minimized);
  const unminimize = restoreAll
    ? windows.map((window) => window.id)
    : rememberedWindows.filter((id) => byId.get(id)!.minimized);
  const visible = windows.filter((window) => !window.minimized || unminimize.includes(window.id));
  const here = visible.filter((window) => window.onActiveWorkspace);
  const candidates = here.length > 0 ? here : visible;
  const rememberedFocus = candidates.find((window) => window.id === remembered?.focusId);
  const newest = candidates.reduce((best, window) => (window.userTime > best.userTime ? window : best));
  return {
    kind: 'show',
    unminimize,
    raise: visible.map((window) => window.id),
    focusId: (rememberedFocus ?? newest).id,
  };
}

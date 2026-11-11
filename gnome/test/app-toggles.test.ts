import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  appKey,
  desktopIdCandidates,
  isValidAccelerator,
  isValidAppId,
  parseAppToggles,
  pickedIdentifier,
  planGrabs,
  serializeAppToggles,
  toggleDecision,
  topWindowAt,
  windowMatchesApp,
  type ToggleWindow,
  type WindowIdentity,
} from '../src/app-toggles.ts';

describe('parseAppToggles and serializeAppToggles', () => {
  test('keep the order of the entries', () => {
    const value: [string, string][] = [
      ['dev.kukka.Kukka', 'section'],
      ['org.gnome.Nautilus', '<Control><Shift>e'],
    ];
    const entries = parseAppToggles(value);
    assert.deepEqual(entries, [
      { app: 'dev.kukka.Kukka', accelerator: 'section' },
      { app: 'org.gnome.Nautilus', accelerator: '<Control><Shift>e' },
    ]);
    assert.deepEqual(serializeAppToggles(entries), value);
  });

  test('give no entries for an empty list', () => {
    assert.deepEqual(parseAppToggles([]), []);
  });
});

describe('isValidAppId', () => {
  test('accepts desktop file names, snap names and window classes', () => {
    for (const app of [
      'dev.kukka.Kukka',
      'org.gnome.Nautilus.desktop',
      'firefox_firefox',
      'google-chrome',
      'jetbrains-idea-ce',
      'Steam',
      'kitty',
    ]) {
      assert.equal(isValidAppId(app), true, app);
    }
  });

  test('refuses an empty identifier, a path, a shell character and a control character', () => {
    for (const app of ['', ' ', '../x', '/usr/bin/x', 'a;rm', 'a$(x)', 'a`x`', 'a\nb', '-x', '.hidden']) {
      assert.equal(isValidAppId(app), false, JSON.stringify(app));
    }
  });

  test('refuses an identifier that is longer than 255 characters', () => {
    assert.equal(isValidAppId('a'.repeat(255)), true);
    assert.equal(isValidAppId('a'.repeat(256)), false);
  });
});

describe('isValidAccelerator', () => {
  test('accepts a key with and without modifiers', () => {
    for (const accelerator of [
      'section',
      '<Control>section',
      '<Control><Shift>k',
      '<Hyper>F1',
      '<Mod3>Left',
      'KP_Add',
    ]) {
      assert.equal(isValidAccelerator(accelerator), true, accelerator);
    }
  });

  test('refuses an empty accelerator, a modifier without a key and other text', () => {
    for (const accelerator of ['', '<Control>', 'a b', '<Control>a<', 'a-b', '<Bogus>a', '<Control>>a']) {
      assert.equal(isValidAccelerator(accelerator), false, accelerator);
    }
  });
});

describe('appKey', () => {
  test('ignores the case and a .desktop suffix', () => {
    assert.equal(appKey('org.gnome.TextEditor.desktop'), 'org.gnome.texteditor');
    assert.equal(appKey('Org.Gnome.TextEditor.DESKTOP'), 'org.gnome.texteditor');
    assert.equal(appKey('kitty'), 'kitty');
  });
});

describe('windowMatchesApp', () => {
  const editor: WindowIdentity = {
    appId: 'org.gnome.TextEditor.desktop',
    wmClass: 'org.gnome.TextEditor',
    wmClassInstance: 'org.gnome.TextEditor',
    gtkApplicationId: 'org.gnome.TextEditor',
    sandboxedAppId: null,
  };
  const none: WindowIdentity = {
    appId: null,
    wmClass: null,
    wmClassInstance: null,
    gtkApplicationId: null,
    sandboxedAppId: null,
  };

  test('matches the app id of the window tracker, with or without the suffix', () => {
    assert.equal(windowMatchesApp('org.gnome.TextEditor', { ...none, appId: 'org.gnome.TextEditor.desktop' }), true);
    assert.equal(
      windowMatchesApp('org.gnome.texteditor.desktop', { ...none, appId: 'org.gnome.TextEditor.desktop' }),
      true,
    );
  });

  test('matches each of the other identifiers of the window', () => {
    assert.equal(windowMatchesApp('Navigator', { ...none, wmClassInstance: 'Navigator' }), true);
    assert.equal(windowMatchesApp('firefox', { ...none, wmClass: 'firefox' }), true);
    assert.equal(windowMatchesApp('dev.kukka.Kukka', { ...none, gtkApplicationId: 'dev.kukka.Kukka' }), true);
    assert.equal(windowMatchesApp('org.mozilla.firefox', { ...none, sandboxedAppId: 'org.mozilla.firefox' }), true);
  });

  test('does not match another app or a part of an identifier', () => {
    assert.equal(windowMatchesApp('org.gnome.Calculator', editor), false);
    assert.equal(windowMatchesApp('org.gnome', editor), false);
    assert.equal(windowMatchesApp('', none), false);
  });
});

describe('desktopIdCandidates', () => {
  test('tries the identifier, then the identifier with .desktop', () => {
    assert.deepEqual(desktopIdCandidates('org.gnome.Calculator'), [
      'org.gnome.Calculator',
      'org.gnome.Calculator.desktop',
    ]);
  });

  test('does not add a second suffix', () => {
    assert.deepEqual(desktopIdCandidates('org.gnome.Calculator.desktop'), ['org.gnome.Calculator.desktop']);
  });
});

describe('pickedIdentifier', () => {
  test('gives the desktop file name without the suffix when the app has a desktop file', () => {
    assert.equal(
      pickedIdentifier({
        appId: 'org.gnome.TextEditor.desktop',
        hasDesktopFile: true,
        wmClass: 'org.gnome.TextEditor',
      }),
      'org.gnome.TextEditor',
    );
  });

  test('gives the window class when the app has no desktop file', () => {
    assert.equal(pickedIdentifier({ appId: 'window:12', hasDesktopFile: false, wmClass: 'xterm' }), 'xterm');
  });

  test('gives an empty identifier when the window has neither', () => {
    assert.equal(pickedIdentifier({ appId: null, hasDesktopFile: false, wmClass: null }), '');
  });
});

describe('topWindowAt', () => {
  const windows = [
    { id: 1, frame: { x: 0, y: 0, width: 100, height: 100 } },
    { id: 2, frame: { x: 50, y: 50, width: 100, height: 100 } },
  ];

  test('gives the top window that has the point in its frame', () => {
    assert.equal(topWindowAt(windows, 75, 75), 2);
    assert.equal(topWindowAt(windows, 10, 10), 1);
  });

  test('includes the left and top edges and excludes the right and bottom edges', () => {
    assert.equal(topWindowAt(windows, 0, 0), 1);
    assert.equal(topWindowAt(windows, 150, 75), null);
  });

  test('gives null when no window is at the point', () => {
    assert.equal(topWindowAt(windows, 500, 500), null);
    assert.equal(topWindowAt([], 0, 0), null);
  });
});

describe('planGrabs', () => {
  const actions = new Map<string, readonly string[]>([
    ['left-half', ['<Hyper>Left']],
    ['restore', []],
  ]);

  test('grabs each entry with Hyper translated', () => {
    const entries = [
      { app: 'dev.kukka.Kukka', accelerator: 'section' },
      { app: 'org.gnome.Nautilus', accelerator: '<Hyper>e' },
    ];
    assert.deepEqual(planGrabs(entries, actions, 'capslock'), {
      grabs: [
        { index: 0, accelerator: 'section' },
        { index: 1, accelerator: '<Mod3>e' },
      ],
      problems: [],
    });
  });

  test('skips an entry that is off', () => {
    assert.deepEqual(planGrabs([{ app: 'kitty', accelerator: '' }], actions, 'super'), { grabs: [], problems: [] });
  });

  test('gives the shortcut to the action, not to the entry', () => {
    const plan = planGrabs([{ app: 'kitty', accelerator: '<Mod3>Left' }], actions, 'capslock');
    assert.deepEqual(plan.grabs, []);
    assert.deepEqual(plan.problems, [
      'Rektangel: app kitty and left-half are both <Mod3>Left, app kitty is not registered',
    ]);
  });

  test('gives the shortcut to the first entry when two entries have it', () => {
    const entries = [
      { app: 'kitty', accelerator: '<Control>section' },
      { app: 'firefox', accelerator: '<Primary>section' },
    ];
    const plan = planGrabs(entries, actions, 'super');
    assert.deepEqual(plan.grabs, [{ index: 0, accelerator: '<Control>section' }]);
    assert.deepEqual(plan.problems, [
      'Rektangel: app firefox and app kitty are both <Control>section, app firefox is not registered',
    ]);
  });

  test('skips an entry with an identifier or an accelerator that is not valid', () => {
    const entries = [
      { app: 'a;b', accelerator: 'section' },
      { app: 'kitty', accelerator: '<Control>' },
    ];
    const plan = planGrabs(entries, actions, 'super');
    assert.deepEqual(plan.grabs, []);
    assert.deepEqual(plan.problems, [
      'Rektangel: app toggle 1 has an identifier that is not valid, it is not registered',
      'Rektangel: app kitty has the accelerator "<Control>" that is not valid, it is not registered',
    ]);
  });
});

describe('toggleDecision', () => {
  const window = (id: number, extra: Partial<ToggleWindow> = {}): ToggleWindow => ({
    id,
    minimized: false,
    onActiveWorkspace: true,
    userTime: id,
    ...extra,
  });

  test('starts the app when it has no window', () => {
    assert.deepEqual(toggleDecision({ windows: [], focusId: null, remembered: undefined }), { kind: 'start' });
  });

  test('hides the windows that are not minimized when the app has the focus, and remembers them', () => {
    const windows = [window(1), window(2, { minimized: true }), window(3)];
    assert.deepEqual(toggleDecision({ windows, focusId: 3, remembered: undefined }), {
      kind: 'hide',
      minimize: [1, 3],
      remember: { windows: [1, 3], focusId: 3 },
    });
  });

  test('shows only the remembered windows, so that a window that the user minimized stays minimized', () => {
    const windows = [window(1, { minimized: true }), window(2, { minimized: true }), window(3, { minimized: true })];
    assert.deepEqual(toggleDecision({ windows, focusId: null, remembered: { windows: [1, 3], focusId: 3 } }), {
      kind: 'show',
      unminimize: [1, 3],
      raise: [1, 3],
      focusId: 3,
    });
  });

  test('ignores a remembered window that is closed', () => {
    const windows = [window(1, { minimized: true }), window(2, { minimized: true })];
    assert.deepEqual(toggleDecision({ windows, focusId: null, remembered: { windows: [1, 9], focusId: 9 } }), {
      kind: 'show',
      unminimize: [1],
      raise: [1],
      focusId: 1,
    });
  });

  test('shows all windows when nothing is remembered and all windows are minimized', () => {
    const windows = [window(1, { minimized: true }), window(2, { minimized: true })];
    assert.deepEqual(toggleDecision({ windows, focusId: null, remembered: undefined }), {
      kind: 'show',
      unminimize: [1, 2],
      raise: [1, 2],
      focusId: 2,
    });
  });

  test('shows all windows when no remembered window exists any more', () => {
    const windows = [window(1, { minimized: true })];
    assert.deepEqual(toggleDecision({ windows, focusId: null, remembered: { windows: [7], focusId: 7 } }), {
      kind: 'show',
      unminimize: [1],
      raise: [1],
      focusId: 1,
    });
  });

  test('raises the visible windows in their stacking order and focuses the newest one when the app has no focus', () => {
    const windows = [window(1, { userTime: 50 }), window(2, { minimized: true }), window(3, { userTime: 10 })];
    assert.deepEqual(toggleDecision({ windows, focusId: null, remembered: undefined }), {
      kind: 'show',
      unminimize: [],
      raise: [1, 3],
      focusId: 1,
    });
  });

  test('prefers a window on the active workspace for the focus', () => {
    const windows = [window(1, { userTime: 10 }), window(2, { userTime: 90, onActiveWorkspace: false })];
    assert.deepEqual(toggleDecision({ windows, focusId: null, remembered: undefined }), {
      kind: 'show',
      unminimize: [],
      raise: [1, 2],
      focusId: 1,
    });
  });

  test('focuses a window on another workspace when the app has no window on the active workspace', () => {
    const windows = [
      window(1, { onActiveWorkspace: false, userTime: 5 }),
      window(2, { onActiveWorkspace: false, userTime: 9 }),
    ];
    const decision = toggleDecision({ windows, focusId: null, remembered: undefined });
    assert.equal(decision.kind === 'show' ? decision.focusId : null, 2);
  });

  test('does not use the remembered focus window when it is on another workspace and the app has a window here', () => {
    const windows = [window(1, { minimized: true }), window(2, { minimized: true, onActiveWorkspace: false })];
    const decision = toggleDecision({ windows, focusId: null, remembered: { windows: [1, 2], focusId: 2 } });
    assert.equal(decision.kind === 'show' ? decision.focusId : null, 1);
  });
});

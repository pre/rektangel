# @rektangel/core

Window calculations ported from [Rectangle](https://github.com/rxhanson/Rectangle). Pure TypeScript with no runtime dependencies. The core does not use GJS, Gio, Node.js or the DOM, so the same bundle runs in gnome-shell (GJS) and later in KWin (QJSEngine).

## Contract

The platform code calls one function. Do not change these names or shapes: the GNOME extension depends on them.

```ts
import { execute, type ExecuteInput, type ExecuteResult } from '@rektangel/core';

function execute(input: ExecuteInput): ExecuteResult;

interface ExecuteInput {
  action: Action;                  // for example 'left-half'
  windowId: string;
  frame: Rect;                     // current frame of the window
  monitorIndex: number;            // index into monitors
  monitors: readonly Monitor[];    // monitors[i].index === i
  canResize: boolean;              // false: move only, keep the size
  history: WindowHistory | undefined;
  config: Readonly<CoreConfig>;
}

interface ExecuteResult {
  change: { frame: Rect; monitorIndex: number } | null;  // null: do not touch the window
  history: WindowHistory | undefined;                     // undefined: delete the entry
}
```

Other exported names:

- `Action` (constant object and type), `allActions`, `isAction(value)`. The action values are kebab-case and are also the gsettings key names.
- `Rect {x, y, width, height}`, `Point {x, y}`, `Monitor {index, geometry, workArea}`.
- `rectEquals`, `rectsIntersect`, `rectCenter`, `clampRect`, `containsPoint`, `monitorForRect`.
- `WindowHistory {restoreRect, lastAction?}`, `LastAction {action, rect, count}`.
- `CoreConfig {cycleSizes, stepSize, cornerAxis, almostMaximizeRatio}`, `CornerAxis`, `defaultConfig`.
- `WindowChange {frame, monitorIndex}`.

## Rules for the caller

1. Give integer pixels. The y axis points down.
2. Keep one `WindowHistory` per window id. Store `result.history` after each call. Delete the entry when the result history is undefined or the window closes.
3. When `change` is not null, apply `change.frame` on monitor `change.monitorIndex`.
4. `execute` does not change its input.

## How execute works

1. `restore` moves the window to `history.restoreRect` and drops `lastAction`.
2. For other actions, a frame that differs from `history.lastAction.rect` means that the user moved the window by hand. Then `lastAction` is dropped and the current frame becomes `restoreRect`.
3. `execute` calls the calculation for the action from the registry in `src/calculations/index.ts`.
4. The result is recorded as `lastAction`. `count` increments when the same action runs again on an unchanged frame.

## Add a calculation

1. Write a test in `test/` first.
2. Add `src/calculations/<name>.ts` that exports a `Calculation`.
3. Register it in `src/calculations/index.ts`.

## Commands

```sh
npm run build          # tsc to dist/
npm test               # build, then node --test
npm run test:coverage  # coverage report, target 80 percent
```

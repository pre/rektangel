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
- `WindowHistory {restoreRect, lastAction?}`, `LastAction {action, rect, count, subAction?}`, `SubAction`. Only thirds set `subAction`. The caller stores it with the rest of the history and does not read it.
- `CoreConfig {cycleSizes, stepSize, cornerAxis, almostMaximizeRatio}`, `CornerAxis`, `defaultConfig`.
- `WindowChange {frame, monitorIndex}`.

## Rules for the caller

1. Give integer pixels. The y axis points down.
2. Keep one `WindowHistory` per window id. Store `result.history` after each call. Delete the entry when the result history is undefined or the window closes.
3. When `change` is not null, apply `change.frame` on monitor `change.monitorIndex`.
4. `execute` does not change its input.

## How execute works

1. `restore` moves the window to `history.restoreRect` and drops `lastAction`. The monitor is the monitor that contains the center of the restore frame. Without history, restore does nothing.
2. For other actions, a frame that differs from `history.lastAction.rect` means that the user moved the window by hand. Then `lastAction` is dropped and the current frame becomes `restoreRect`.
3. `execute` calls the calculation for the action from the registry in `src/calculations/index.ts`. A calculation returns null when the action does not apply, for example `next-display` with one monitor.
4. `execute` rounds the frame to integer pixels (see below).
5. When `canResize` is false and the size would change, the window keeps its size. It goes to the work-area edges that the calculated frame touches, or to the center of the calculated frame on an axis where it touches no edge or both edges. This is Rectangle `FixedSizeWindowMover` with the default `edgesAndCorners` alignment. A window that cannot resize and is larger than the work area starts at the top-left of the work area.
6. Otherwise the frame is moved and cut to fit into the work area of the target monitor, as Rectangle `BestEffortWindowMover` does.
7. The result is recorded as `lastAction`. Some calculations record a different action: `center` and the display actions record `maximize` when they maximize the window, as Rectangle `resultingAction` does. `count` increments when the recorded action is the same as the last one on an unchanged frame. The action is recorded also when the frame does not change.

## Coordinates and rounding

Rectangle works in macOS screen coordinates: the origin is at the bottom left and the y axis points up. Mutter and this core use the top-left origin, and the y axis points down. The port keeps the meaning of each Rectangle calculation and mirrors the vertical axis. For example, Rectangle "top half" sets `y = maxY - height`, and the port sets `y = workArea.y`.

Rectangle centers on the vertical axis with `y = minY + round((H - h) / 2)`, which is the gap below the window. The port uses the same formula for the gap above the window. When `H - h` is odd, the window can be one pixel higher than a mirrored Rectangle window.

Rounding:

1. The calculations floor and round where Rectangle does. Fractions of the work area floor with a tolerance of 0.0001 (`HalfSplitFrameCalculation`), so that `1665 * 2/3` gives 1110. Thirds use `floor`. Centering and almost maximize use `Math.round`.
2. Some Rectangle results are fractional, for example the center third (width `W / 3`) and the display transfer. `execute` rounds each edge (left, top, right, bottom) to the nearest pixel, and then calculates the width and the height from the edges. Two frames that share an edge before the rounding also share it after the rounding.

## Calculations

| Action | Rectangle source | File |
|--------|------------------|------|
| left-half, right-half, top-half, bottom-half | `LeftRightHalfCalculation`, `TopHalfCalculation`, `BottomHalfCalculation`, `RepeatedExecutionsCalculation` | `halves.ts`, `../cycle.ts` |
| top-left, top-right, bottom-left, bottom-right | `UpperLeftCalculation` and siblings, `CornerCycleExpansionCalculation` | `corners.ts` |
| first-third, center-third, last-third, first-two-thirds, last-two-thirds | `FirstThirdCalculation` and siblings, `OrientationAware` | `thirds.ts` |
| maximize, almost-maximize, maximize-height | `MaximizeCalculation`, `AlmostMaximizeCalculation`, `MaximizeHeightCalculation` | `maximize.ts` |
| center | `CenterCalculation` | `center.ts` |
| larger, smaller | `ChangeSizeCalculation`, `ChangeWindowDimensionCalculation` | `change-size.ts` |
| move-left, move-right, move-up, move-down | `MoveLeftRightCalculation`, `MoveUpDownCalculation` | `move.ts` |
| previous-display, next-display | `NextPrevDisplayCalculation`, `DisplayTransfer`, `ScreenDetection.order` | `display.ts`, `display-transfer.ts` |
| restore | `WindowManager.execute` | `../execute.ts` |

The port uses the Rectangle defaults: `subsequentExecutionMode = resize`, `cooperativeCornerResize` off, `centeredDirectionalMove` on, `resizeOnDirectionalMove` off, `curtainChangeSize` on, `smallerShrinksMaximizedHeight` off, `attemptMatchOnNextPrevDisplay` off, `screensOrderedByX = yThenMinX`, no gaps, no split ratios. Repeated cycles:

- Halves and corners: 1/2, 2/3, 1/3 of the work area, then 1/2 again. Corners cycle only along `cornerAxis`. Another action starts at 1/2 again.
- Thirds: first-third goes left, center, right. last-third goes right, center, left. first-two-thirds and last-two-thirds swap sides. On a portrait work area (height not smaller than width) the thirds stack from top to bottom.
- Next and previous display: with two monitors both go to the other monitor. With three or more, the order wraps around.

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

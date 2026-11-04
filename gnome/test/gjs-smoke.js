// Run with: gjs -m test/gjs-smoke.js (after node esbuild.mjs).
// Checks that the core bundle loads and runs in GJS, outside gnome-shell.
import { defaultConfig, execute } from '../build/core.js';

const workArea = { x: 0, y: 32, width: 3008, height: 1660 };
const result = execute({
  action: 'maximize',
  windowId: '1',
  frame: { x: 100, y: 200, width: 800, height: 600 },
  monitorIndex: 0,
  monitors: [{ index: 0, geometry: { x: 0, y: 0, width: 3008, height: 1692 }, workArea }],
  canResize: true,
  history: undefined,
  config: defaultConfig,
});

const expected = JSON.stringify({ frame: workArea, monitorIndex: 0 });
const actual = JSON.stringify(result.change);
if (actual !== expected) {
  throw new Error(`gjs smoke test failed: expected ${expected}, got ${actual}`);
}
print('gjs smoke test passed: maximize');

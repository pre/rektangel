// Run with: XDG_CONFIG_HOME=test/fixtures/config gjs -m test/gjs-smoke.js
// (after node esbuild.mjs). Checks that the core bundle and the config
// reader load and run in GJS, outside gnome-shell.
import GLib from 'gi://GLib';
import { execute } from '../build/core.js';
import { configPath, loadConfig } from '../build/config-file.js';

function check(name, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`gjs smoke test failed: ${name}: expected ${expectedJson}, got ${actualJson}`);
  }
}

const configHome = GLib.getenv('XDG_CONFIG_HOME') ?? '';
if (!configHome.endsWith('test/fixtures/config')) {
  throw new Error('Set XDG_CONFIG_HOME=test/fixtures/config, so that the test reads the sample config');
}

const config = loadConfig();
check(`config from ${configPath()}`, config, {
  cycleSizes: [0.5, 0.75],
  stepSize: 40,
  cornerAxis: 'vertical',
  almostMaximizeRatio: 0.8,
});

const frame = { x: 100, y: 200, width: 800, height: 600 };
const workArea = { x: 0, y: 32, width: 3008, height: 1660 };
const monitors = [{ index: 0, geometry: { x: 0, y: 0, width: 3008, height: 1692 }, workArea }];
const input = { windowId: '1', monitorIndex: 0, monitors, canResize: true, config };

const maximized = execute({ ...input, action: 'maximize', frame, history: undefined });
check('maximize', maximized.change, { frame: workArea, monitorIndex: 0 });

const restored = execute({ ...input, action: 'restore', frame: workArea, history: maximized.history });
check('restore', restored.change, { frame, monitorIndex: 0 });

print('gjs smoke test passed: config.toml, maximize, restore');

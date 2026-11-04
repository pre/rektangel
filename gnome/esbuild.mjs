import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

const shared = {
  bundle: true,
  format: 'esm',
  target: 'firefox115',
  minify: false,
  legalComments: 'inline',
};

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/schemas', { recursive: true });

await build({
  ...shared,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  external: ['gi://*', 'resource:///*'],
});

// The GJS smoke test imports the core alone, outside gnome-shell.
await build({
  ...shared,
  entryPoints: ['@rektangel/core'],
  outfile: 'build/core.js',
});

cpSync('metadata.json', 'dist/metadata.json');
cpSync('schemas', 'dist/schemas', { recursive: true });
execFileSync('glib-compile-schemas', ['--strict', 'dist/schemas'], { stdio: 'inherit' });
copyFileSync('../LICENSE', 'dist/LICENSE');
copyFileSync('gnome-keys.sh', 'dist/gnome-keys.sh');

import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const shared = {
  bundle: true,
  format: 'esm',
  target: 'firefox115',
  minify: false,
  legalComments: 'inline',
};

rmSync('dist', { recursive: true, force: true });
rmSync('build', { recursive: true, force: true });
mkdirSync('dist/schemas', { recursive: true });

// Two bundles: gnome-shell loads extension.js, and a separate gjs process
// loads prefs.js. Neither process can load the modules of the other.
for (const name of ['extension', 'prefs']) {
  await build({
    ...shared,
    entryPoints: [`src/${name}.ts`],
    outfile: `dist/${name}.js`,
    external: ['gi://*', 'resource:///*'],
  });
}

// The GJS smoke test runs these bundles outside gnome-shell, so they must
// not import resource:///org/gnome/shell/*.
await build({
  ...shared,
  entryPoints: {
    core: '@rektangel/core',
    'config-file': 'src/config-file.ts',
    'translated-settings': 'src/translated-settings.ts',
    'capslock-mode': 'src/capslock-mode.ts',
    migrate: 'src/migrate.ts',
  },
  outdir: 'build',
  external: ['gi://*'],
});

// The release workflow sets version-name before the build. A local build gets
// the commit, so the preferences window and the Extensions app show it.
const metadata = JSON.parse(readFileSync('metadata.json', 'utf8'));
metadata['version-name'] ??= `git-${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}`;
writeFileSync('dist/metadata.json', `${JSON.stringify(metadata, null, 2)}\n`);
cpSync('schemas', 'dist/schemas', { recursive: true });
execFileSync('glib-compile-schemas', ['--strict', 'dist/schemas'], { stdio: 'inherit' });
copyFileSync('../LICENSE', 'dist/LICENSE');
copyFileSync('gnome-keys.sh', 'dist/gnome-keys.sh');
cpSync('hyper', 'dist/hyper', { recursive: true });

// hyper/install.sh and uninstall.sh run this with gjs.
await build({
  ...shared,
  entryPoints: ['src/capslock-cli.ts'],
  outfile: 'dist/hyper/capslock-mode.js',
  external: ['gi://*'],
});

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The global names that gjs gives to a module, in addition to the ECMAScript ones.
const gjsGlobals = {
  ARGV: 'readonly',
  console: 'readonly',
  imports: 'readonly',
  log: 'readonly',
  logError: 'readonly',
  print: 'readonly',
  printerr: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
};

// The rules do not use type information. The gnome workspace gets the types of
// @rektangel/core from core/dist, so type-aware rules would need a core build
// before each lint run.
export default defineConfig(
  { ignores: ['**/dist/', '**/build/', '**/coverage/', '**/node_modules/', '**/*.zip'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['eslint.config.js', 'gnome/esbuild.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['gnome/test/*.js'],
    languageOptions: { globals: gjsGlobals },
  },
);

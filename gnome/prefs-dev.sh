#!/usr/bin/env bash
# Developer tool: builds the extension and opens the preferences window
# from gnome/dist, without an install or a logout.
#   prefs-dev.sh            uses the real dconf: changes apply to your session
#   prefs-dev.sh --sandbox  uses a keyfile backend and a temporary
#                           XDG_CONFIG_HOME under $HOME/tmp: nothing real changes
set -euo pipefail

gnome_dir="$(cd "$(dirname "$0")" && pwd)"
dist_dir="$gnome_dir/dist"

case "${1:-}" in
  "") sandbox=false ;;
  --sandbox) sandbox=true ;;
  *) echo "Usage: $0 [--sandbox]" >&2; exit 2 ;;
esac

# The ExtensionPreferences class needs the typelibs of gnome-shell.
typelib_dir=""
for dir in /usr/lib*/gnome-shell/girepository-1.0; do
  if [[ -d "$dir" ]]; then
    typelib_dir="$dir"
    break
  fi
done
if [[ -z "$typelib_dir" ]]; then
  echo "Cannot find gnome-shell/girepository-1.0 under /usr/lib*. Install gnome-shell." >&2
  exit 1
fi

# The bundles include core/dist. esbuild.mjs also compiles the schema
# into dist/schemas.
(cd "$gnome_dir/.." && npm run build --workspace core)
(cd "$gnome_dir" && node esbuild.mjs)

export GI_TYPELIB_PATH="$typelib_dir${GI_TYPELIB_PATH:+:$GI_TYPELIB_PATH}"
export LD_LIBRARY_PATH="${typelib_dir%/girepository-1.0}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

if [[ "$sandbox" == true ]]; then
  mkdir -p "$HOME/tmp"
  config_home="$(mktemp -d "$HOME/tmp/rektangel-prefs-sandbox.XXXXXX")"
  trap 'rm -rf "$config_home"' EXIT
  echo "Sandbox: settings go to $config_home"
  GSETTINGS_BACKEND=keyfile XDG_CONFIG_HOME="$config_home" \
    gjs -m "$gnome_dir/test/prefs-launcher.js" "$dist_dir"
else
  gjs -m "$gnome_dir/test/prefs-launcher.js" "$dist_dir"
fi

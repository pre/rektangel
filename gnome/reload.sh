#!/usr/bin/env bash
# Developer tool: packs the zip, installs it over the installed extension,
# and disables and enables the extension. The shell then reads the schema
# again, so new defaults work at once. The extension and prefs code stay
# the old code until the next login, see README.md.
set -euo pipefail

uuid="rektangel@repo.pet"
gnome_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(dirname "$gnome_dir")"

"$gnome_dir/pack.sh"
gnome-extensions install --force "$repo_dir/$uuid.zip"
gnome-extensions disable "$uuid"
gnome-extensions enable "$uuid"
gnome-extensions info "$uuid" | grep -E '^\s*(State|Version)'

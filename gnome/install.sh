#!/usr/bin/env bash
# Developer tool: builds the extension and copies it into the user
# extensions directory, for a test in a nested shell.
# End users install the release zip instead, see README.md.
set -euo pipefail

uuid="rektangel@repo.pet"
gnome_dir="$(cd "$(dirname "$0")" && pwd)"
target="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$uuid"

(cd "$gnome_dir/.." && npm run build)

rm -rf "$target"
mkdir -p "$target"
cp -r "$gnome_dir/dist/." "$target/"
echo "Installed $uuid to $target"
echo "Log out and in, then run: gnome-extensions enable $uuid"

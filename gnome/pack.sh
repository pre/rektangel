#!/usr/bin/env bash
# Builds the extension and writes the release zip rektangel@repo.pet.zip
# to the repository root. Install it with:
#   gnome-extensions install rektangel@repo.pet.zip
set -euo pipefail

uuid="rektangel@repo.pet"
gnome_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(dirname "$gnome_dir")"
zip_file="$repo_dir/$uuid.zip"

(cd "$repo_dir" && npm run build)

# GNOME Shell 44 and later compile the schema at install. The gjs.guide
# port guide for GNOME 44 says not to ship gschemas.compiled.
rm -f "$zip_file"
(cd "$gnome_dir/dist" && zip -r -X "$zip_file" \
  extension.js prefs.js metadata.json schemas LICENSE gnome-keys.sh hyper \
  -x schemas/gschemas.compiled)
echo "Wrote $zip_file"

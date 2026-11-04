#!/usr/bin/env bash
# Turns on the Rektangel Caps Lock mode for the current user:
#  1. copies the XKB option files to $XDG_CONFIG_HOME/xkb,
#  2. adds the option rektangel:caps_hyper to
#     org.gnome.desktop.input-sources xkb-options,
#  3. sets the Rektangel bindings to the Caps Lock variants.
# The old values go to ~/.config/rektangel/hyper-backup.json.
# uninstall.sh reverses the three steps.
#
# Usage: install.sh [--dry-run]
# Needs: gsettings, jq. No root.
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
parse_args "$@"
check_schema

if [[ -e "$backup_file" ]]; then
  echo "Caps Lock mode is already on: $backup_file exists. Run uninstall.sh first." >&2
  exit 1
fi

for file in "${xkb_files[@]}"; do
  target="$xkb_dir/$file"
  if [[ -e "$target" ]] && ! cmp -s "$hyper_dir/xkb/$file" "$target"; then
    echo "$target exists and is not the Rektangel file. Merge it by hand." >&2
    exit 1
  fi
done

options=$(gsettings get "$input_schema" xkb-options | gvariant_to_json)
if jq -e 'any(startswith("caps:"))' <<<"$options" >/dev/null; then
  echo "xkb-options has a caps: option that also changes Caps Lock: $options" >&2
  echo "Remove it first, for example in GNOME Tweaks." >&2
  exit 1
fi

backup=$(jq -n --argjson options "$options" '{"xkb-options": $options, bindings: {}}')
for entry in "${hyper_bindings[@]}"; do
  read -r key accel <<<"$entry"
  current=$(gsettings --schemadir "$schema_dir" get "$rektangel_schema" "$key" | gvariant_to_json)
  backup=$(jq -c --arg key "$key" --argjson value "$current" '.bindings[$key] = $value' <<<"$backup")
done

if $dry_run; then
  echo "Would write $backup_file:"
  jq . <<<"$backup"
else
  mkdir -p "$(dirname "$backup_file")"
  jq . <<<"$backup" >"$backup_file"
fi

for file in "${xkb_files[@]}"; do
  run mkdir -p "$(dirname "$xkb_dir/$file")"
  run cp "$hyper_dir/xkb/$file" "$xkb_dir/$file"
done

if jq -e --arg option "$xkb_option" 'index($option) == null' <<<"$options" >/dev/null; then
  run gsettings set "$input_schema" xkb-options \
    "$(jq -c --arg option "$xkb_option" '. + [$option]' <<<"$options" | json_to_gvariant)"
fi

for entry in "${hyper_bindings[@]}"; do
  read -r key accel <<<"$entry"
  run gsettings --schemadir "$schema_dir" set "$rektangel_schema" "$key" "['$accel']"
done

if $dry_run; then
  echo "Dry run: nothing changed."
else
  echo "Caps Lock mode is on. Hold Caps Lock and press an arrow key."
  echo "Shift+Caps Lock toggles caps lock."
fi

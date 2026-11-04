#!/usr/bin/env bash
# Turns off the Rektangel Caps Lock mode for the current user:
#  1. writes back the Rektangel bindings from the backup,
#  2. removes the option rektangel:caps_hyper from xkb-options,
#  3. removes the XKB option files that install.sh copied.
# Other xkb-options, also those added after install.sh, stay.
#
# Usage: uninstall.sh [--dry-run]
# Needs: gsettings, dconf, jq. No root. Uses /usr/bin/gsettings and
# /usr/bin/dconf when they exist, see common.sh.
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
parse_args "$@"
check_schema
check_backend

if [[ ! -e "$backup_file" ]]; then
  echo "No backup at $backup_file. Caps Lock mode is not on." >&2
  exit 1
fi

while IFS=$'\t' read -r key user_set value; do
  if [[ "$user_set" == true ]]; then
    run "$gsettings" --schemadir "$schema_dir" set "$rektangel_schema" "$key" "$(json_to_gvariant <<<"$value")"
  else
    run "$gsettings" --schemadir "$schema_dir" reset "$rektangel_schema" "$key"
  fi
done < <(jq -r '.bindings | to_entries[] | [.key, .value.user_set, (.value.value | tojson)] | @tsv' "$backup_file")

options=$("$gsettings" get "$input_schema" xkb-options | gvariant_to_json)
if jq -e --arg option "$xkb_option" 'index($option) != null' <<<"$options" >/dev/null; then
  run "$gsettings" set "$input_schema" xkb-options \
    "$(jq -c --arg option "$xkb_option" 'map(select(. != $option))' <<<"$options" | json_to_gvariant)"
fi

for file in "${xkb_files[@]}"; do
  target="$xkb_dir/$file"
  if [[ ! -e "$target" ]]; then
    continue
  fi
  if cmp -s "$hyper_dir/xkb/$file" "$target"; then
    run rm "$target"
  else
    echo "Kept $target, because it is not the Rektangel file."
  fi
done
for dir in "$xkb_dir/rules" "$xkb_dir/symbols" "$xkb_dir"; do
  if [[ -d "$dir" ]] && [[ -z "$(ls -A "$dir")" ]]; then
    run rmdir "$dir"
  fi
done

run rm "$backup_file"
if $dry_run; then
  echo "Dry run: nothing changed."
else
  echo "Caps Lock mode is off."
fi

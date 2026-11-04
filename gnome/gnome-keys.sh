#!/usr/bin/env bash
# Removes the GNOME keybindings that conflict with the Rektangel defaults.
# Only the conflicting entries are removed, the other entries stay.
# The old values go to a backup file, and --undo writes them back.
#
# Usage: gnome-keys.sh [--dry-run] [--undo]
# Needs: gsettings, jq
set -euo pipefail

backup_dir="${XDG_CONFIG_HOME:-$HOME/.config}/rektangel"
backup_file="$backup_dir/gnome-keys-backup.json"

# schema key accelerator
conflicts=(
  "org.gnome.desktop.wm.keybindings switch-to-workspace-left <Super><Alt>Left"
  "org.gnome.desktop.wm.keybindings switch-to-workspace-right <Super><Alt>Right"
  "org.gnome.shell.keybindings shift-overview-up <Super><Alt>Up"
  "org.gnome.shell.keybindings shift-overview-down <Super><Alt>Down"
  "org.gnome.desktop.wm.keybindings move-to-workspace-up <Control><Shift><Alt>Up"
  "org.gnome.desktop.wm.keybindings move-to-workspace-right <Control><Shift><Alt>Right"
  "org.gnome.desktop.wm.keybindings move-to-workspace-left <Control><Shift><Alt>Left"
)

dry_run=false
undo=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    --undo) undo=true ;;
    -h | --help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

run() {
  if $dry_run; then
    printf '%q ' "$@"
    echo
  else
    "$@"
  fi
}

# GVariant text such as ['<Super>a', '<Alt>b'] or @as [] to a JSON array.
gvariant_to_json() {
  sed -e 's/^@as //' -e "s/'/\"/g" | jq -c .
}

json_to_gvariant() {
  jq -r '"[" + (map("'"'"'" + . + "'"'"'") | join(", ")) + "]"'
}

# The canonical form ignores case and modifier order, and <Primary> or
# <Ctrl> is the same as <Control>.
normalize_jq='
  def normalize:
    ascii_downcase
    | gsub("<(primary|ctrl)>"; "<control>")
    | [([scan("<[a-z0-9_]+>")] | sort | join("")), sub("(<[a-z0-9_]+>)*"; "")]
    | join("");
'

remove_conflicts() {
  if [[ -e "$backup_file" ]]; then
    echo "Backup $backup_file exists. Run --undo first, or remove the file." >&2
    exit 1
  fi

  local backup='{}' changes=() entry schema key accel current updated
  for entry in "${conflicts[@]}"; do
    read -r schema key accel <<<"$entry"
    current=$(gsettings get "$schema" "$key" | gvariant_to_json)
    updated=$(jq -c --arg accel "$accel" "$normalize_jq"'
      ($accel | normalize) as $target | map(select(normalize != $target))' <<<"$current")
    if [[ "$current" == "$updated" ]]; then
      echo "No conflict: $schema $key"
      continue
    fi
    backup=$(jq -c --arg schema "$schema" --arg key "$key" --argjson value "$current" \
      '.[$schema][$key] = $value' <<<"$backup")
    changes+=("$schema" "$key" "$(json_to_gvariant <<<"$updated")")
  done

  if [[ "$backup" == '{}' ]]; then
    echo "Nothing to change."
    return
  fi
  if $dry_run; then
    echo "Would write $backup_file:"
    jq . <<<"$backup"
  else
    mkdir -p "$backup_dir"
    jq . <<<"$backup" >"$backup_file"
    echo "Saved the old values to $backup_file"
  fi

  # The backup is on disk before the first change.
  local i
  for ((i = 0; i < ${#changes[@]}; i += 3)); do
    run gsettings set "${changes[i]}" "${changes[i + 1]}" "${changes[i + 2]}"
  done
}

restore_backup() {
  if [[ ! -e "$backup_file" ]]; then
    echo "No backup at $backup_file. Nothing to undo." >&2
    exit 1
  fi

  local schema key value
  while IFS=$'\t' read -r schema key value; do
    run gsettings set "$schema" "$key" "$(json_to_gvariant <<<"$value")"
  done < <(jq -r 'to_entries[] | .key as $schema | .value | to_entries[]
    | [$schema, .key, (.value | tojson)] | @tsv' "$backup_file")

  run rm "$backup_file"
}

if $undo; then
  restore_backup
else
  remove_conflicts
fi

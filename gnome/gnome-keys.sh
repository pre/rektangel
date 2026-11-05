#!/usr/bin/env bash
# Removes the GNOME keybindings that are equal to a current Rektangel
# shortcut. Only the equal entries are removed, the other entries stay.
# The old values go to a backup file, and --undo writes them back.
#
# Usage: gnome-keys.sh [--dry-run] [--undo] [--schemadir DIR]
# DIR has the compiled Rektangel schema. The default is the schemas
# directory of the installed extension.
# Needs: gsettings, dconf, jq. Uses /usr/bin/gsettings and /usr/bin/dconf
# when they exist, because a Homebrew GLib can write to a keyfile, not dconf.
set -euo pipefail

backup_dir="${XDG_CONFIG_HOME:-$HOME/.config}/rektangel"
backup_file="$backup_dir/gnome-keys-backup.json"
schema_dir="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/rektangel@repo.pet/schemas"
rektangel_schema=org.gnome.shell.extensions.rektangel
gnome_schemas=(
  org.gnome.desktop.wm.keybindings
  org.gnome.mutter.keybindings
  org.gnome.mutter.wayland.keybindings
  org.gnome.shell.keybindings
  org.gnome.settings-daemon.plugins.media-keys
  org.freedesktop.ibus.panel.emoji
)

# Prefer the system tools. A gsettings from Homebrew or linuxbrew often has
# no dconf module, so it writes to a keyfile that GNOME Shell does not read.
system_tool() {
  if [[ -x "/usr/bin/$1" ]]; then echo "/usr/bin/$1"; else echo "$1"; fi
}
gsettings=$(system_tool gsettings)
dconf=$(system_tool dconf)

# With the dconf backend, gsettings shows the dconf value, or the schema
# default (the memory backend value) when dconf has no value for the key.
check_backend() {
  local schema=org.gnome.shell key=enabled-extensions
  local from_gsettings from_dconf expected
  from_gsettings=$("$gsettings" get "$schema" "$key")
  from_dconf=$("$dconf" read "/org/gnome/shell/$key")
  expected=${from_dconf:-$(GSETTINGS_BACKEND=memory "$gsettings" get "$schema" "$key")}
  if [[ "$from_gsettings" != "$expected" ]]; then
    echo "$gsettings does not use dconf, so GNOME Shell will not see its changes." >&2
    echo "  $gsettings get $schema $key: $from_gsettings" >&2
    echo "  $dconf read /org/gnome/shell/$key: ${from_dconf:-(no value)}" >&2
    echo "Use a gsettings with the dconf backend (package dconf-gsettings-backend)." >&2
    exit 1
  fi
}

dry_run=false
undo=false
while (($# > 0)); do
  case "$1" in
    --dry-run) dry_run=true ;;
    --undo) undo=true ;;
    --schemadir)
      schema_dir=${2:?--schemadir needs a directory}
      shift
      ;;
    -h | --help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
  shift
done

run() {
  if $dry_run; then
    printf '%q ' "$@"
    echo
  else
    "$@"
  fi
}

json_to_gvariant() {
  jq -r '"[" + (map("'"'"'" + . + "'"'"'") | join(", ")) + "]"'
}

# The dconf path of a schema. The GNOME schemas use the schema id as the path.
dconf_path() {
  case "$1" in
    org.freedesktop.ibus.panel.emoji) echo /desktop/ibus/panel/emoji/ ;;
    *) echo "/${1//.//}/" ;;
  esac
}

# Prints true when the user set the key. Empty dconf output means that the
# schema default applies.
user_set() {
  if [[ -n "$("$dconf" read "$(dconf_path "$1")$2")" ]]; then echo true; else echo false; fi
}

# jq: the lines of "gsettings list-recursively" to
# {schema, key, value} objects, for the keys with a list of strings.
string_lists_jq='
  [inputs
   | capture("^(?<schema>\\S+) (?<key>\\S+) (?<value>.*)$")
   | .value |= (sub("^@as "; "") | gsub("'"'"'"; "\"") | try fromjson catch null)
   | select(.value | type == "array" and all(type == "string"))]
'

# The canonical form ignores modifier order and case, and <Primary> or
# <Ctrl> is the same as <Control>. A key of one letter ignores case.
# shellcheck disable=SC2016 # jq variables, not shell variables
normalize_jq='
  def normalize:
    [scan("<[^>]+>") | ascii_downcase | sub("^<(primary|ctrl)>$"; "<control>")] as $modifiers
    | sub("^(<[^>]+>)*"; "") as $key
    | ($modifiers | unique | join("")) + (if ($key | length) == 1 then $key | ascii_downcase else $key end);
'

# The current Rektangel shortcuts, normalized, as a JSON array. The
# conflicts are found in the stored <Super> form for all super-key values.
rektangel_accelerators() {
  if [[ ! -e "$schema_dir/gschemas.compiled" ]]; then
    echo "No compiled Rektangel schema in $schema_dir. Install the extension, or use --schemadir." >&2
    exit 1
  fi
  "$gsettings" --schemadir "$schema_dir" list-recursively "$rektangel_schema" |
    jq -R -n -c "$normalize_jq$string_lists_jq"'| [.[].value[] | normalize] | unique'
}

# Prints {schema, key, value, updated} for each GNOME key with an entry
# that is equal to a Rektangel shortcut.
find_conflicts() {
  local ours=$1 schema
  for schema in "${gnome_schemas[@]}"; do
    if ! "$gsettings" list-schemas | grep -qxF "$schema"; then
      continue
    fi
    "$gsettings" list-recursively "$schema" |
      jq -R -n -c --argjson ours "$ours" "$normalize_jq$string_lists_jq"'
        .[] | .updated = [.value[] | select(normalize as $n | $ours | index($n) | not)]
        | select(.updated != .value)'
  done
}

remove_conflicts() {
  local ours conflicts backup='{}' schema key value updated
  ours=$(rektangel_accelerators)
  conflicts=$(find_conflicts "$ours")
  if [[ -z "$conflicts" ]]; then
    echo "Nothing to change."
    return
  fi
  if [[ -e "$backup_file" ]]; then
    backup=$(jq -c . "$backup_file")
  fi

  # A key that is in the backup already keeps its first value, so that
  # --undo goes back to the state before the first run.
  while IFS=$'\t' read -r schema key value; do
    backup=$(jq -c --arg schema "$schema" --arg key "$key" --argjson value "$value" \
      --argjson user_set "$(user_set "$schema" "$key")" '
      if .[$schema][$key] == null then .[$schema][$key] = {value: $value, user_set: $user_set} end' <<<"$backup")
  done < <(jq -r '[.schema, .key, (.value | tojson)] | @tsv' <<<"$conflicts")

  if $dry_run; then
    echo "Would write $backup_file:"
    jq . <<<"$backup"
  else
    mkdir -p "$backup_dir"
    jq . <<<"$backup" >"$backup_file"
    echo "Saved the old values to $backup_file"
  fi

  # The backup is on disk before the first change.
  while IFS=$'\t' read -r schema key updated; do
    run "$gsettings" set "$schema" "$key" "$(json_to_gvariant <<<"$updated")"
  done < <(jq -r '[.schema, .key, (.updated | tojson)] | @tsv' <<<"$conflicts")
}

restore_backup() {
  if [[ ! -e "$backup_file" ]]; then
    echo "No backup at $backup_file. Nothing to undo." >&2
    exit 1
  fi

  local schema key user_set value
  while IFS=$'\t' read -r schema key user_set value; do
    if [[ "$user_set" == true ]]; then
      run "$gsettings" set "$schema" "$key" "$(json_to_gvariant <<<"$value")"
    else
      run "$gsettings" reset "$schema" "$key"
    fi
  done < <(jq -r 'to_entries[] | .key as $schema | .value | to_entries[]
    | [$schema, .key, .value.user_set, (.value.value | tojson)] | @tsv' "$backup_file")

  run rm "$backup_file"
}

check_backend
if $undo; then
  restore_backup
else
  remove_conflicts
fi

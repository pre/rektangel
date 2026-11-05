# shellcheck shell=bash disable=SC2034
# Shared by install.sh and uninstall.sh. Source it, do not run it.

hyper_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
schema_dir="$hyper_dir/../schemas"
rektangel_schema="org.gnome.shell.extensions.rektangel"

# Prefer the system tools. A gsettings from Homebrew or linuxbrew often has
# no dconf module, so it writes to a keyfile that GNOME Shell does not read.
system_tool() {
  if [[ -x "/usr/bin/$1" ]]; then echo "/usr/bin/$1"; else echo "$1"; fi
}
gsettings=$(system_tool gsettings)
dconf=$(system_tool dconf)
gjs=$(system_tool gjs)

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
parse_args() {
  for arg in "$@"; do
    case "$arg" in
      --dry-run) dry_run=true ;;
      -h | --help)
        sed -n '2,/^set /p' "$0" | sed -e '$d' -e 's/^# \{0,1\}//'
        exit 0
        ;;
      *)
        echo "Unknown argument: $arg" >&2
        exit 2
        ;;
    esac
  done
}

# Runs a command, or prints it with --dry-run.
run() {
  if $dry_run; then
    printf '%q ' "$@"
    echo
  else
    "$@"
  fi
}

check_schema() {
  if [[ ! -e "$schema_dir/gschemas.compiled" ]]; then
    echo "No compiled schema in $schema_dir. Run this script from the installed extension." >&2
    exit 1
  fi
}

# Runs the XKB option step of capslock-mode.js: install or remove. With
# --dry-run it shows the changes and does not do them.
xkb_option() {
  local flags=()
  if $dry_run; then flags=(--dry-run); fi
  "$gjs" -m "$hyper_dir/capslock-mode.js" "$1" "${flags[@]}"
}

set_super_key() {
  run "$gsettings" --schemadir "$schema_dir" set "$rektangel_schema" super-key "$1"
}

# true after an install, false after a remove. The extension installs the
# option at enable only while this is false.
set_xkb_option_installed() {
  run "$gsettings" --schemadir "$schema_dir" set "$rektangel_schema" xkb-option-installed "$1"
}

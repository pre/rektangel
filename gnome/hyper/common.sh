# shellcheck shell=bash disable=SC2034
# Shared by install.sh and uninstall.sh. Source it, do not run it.

hyper_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
schema_dir="$hyper_dir/../schemas"
config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
xkb_dir="$config_home/xkb"
backup_file="$config_home/rektangel/hyper-backup.json"
xkb_files=(rules/evdev rules/evdev.lst symbols/rektangel)
xkb_option="rektangel:caps_hyper"
rektangel_schema="org.gnome.shell.extensions.rektangel"
input_schema="org.gnome.desktop.input-sources"

# The Caps Lock mode bindings. Caps Lock sets Mod3. The bindings use
# <Mod3> and not <Hyper>, because Mutter resolves <Hyper> to every real
# modifier that the Hyper virtual modifier maps to (Lock and Mod4 too).
hyper_bindings=(
  "left-half <Mod3>Left"
  "right-half <Mod3>Right"
  "top-half <Mod3>Up"
  "bottom-half <Mod3>Down"
  "maximize <Mod3>f"
  "center <Mod3>c"
  "maximize-height <Mod3><Shift>Up"
  "larger <Mod3><Shift>Right"
  "smaller <Mod3><Shift>Left"
  "previous-display <Mod3><Alt>Left"
  "next-display <Mod3><Alt>Right"
  "top-left <Mod3><Control>Left"
  "top-right <Mod3><Control>Right"
  "bottom-left <Mod3><Control><Shift>Left"
  "bottom-right <Mod3><Control><Shift>Right"
  "restore <Mod3>BackSpace"
)

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

# GVariant text such as ['a', 'b'] or @as [] to a JSON array, and back.
gvariant_to_json() {
  sed -e 's/^@as //' -e "s/'/\"/g" | jq -c .
}

json_to_gvariant() {
  jq -r '"[" + (map("'"'"'" + . + "'"'"'") | join(", ")) + "]"'
}

#!/usr/bin/env bash
# Turns on the Rektangel Caps Lock mode for the current user:
#  1. copies the XKB option files to $XDG_CONFIG_HOME/xkb, or adds the
#     Rektangel lines to the user XKB files that are there,
#  2. adds the Rektangel option of caps-lock-behavior to
#     org.gnome.desktop.input-sources xkb-options,
#  3. sets the Rektangel setting super-key to capslock.
# The shortcuts do not change: Rektangel registers each <Super> shortcut
# with Caps Lock. uninstall.sh reverses the three steps.
#
# Usage: install.sh [--dry-run]
# Needs: gsettings, dconf, gjs. No root. Uses /usr/bin/gsettings,
# /usr/bin/dconf and /usr/bin/gjs when they exist, see common.sh.
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=common.sh
source "$(dirname "$0")/common.sh"
parse_args "$@"
check_schema
check_backend

xkb_option install
set_xkb_option_installed true
set_super_key capslock

if $dry_run; then
  echo "Dry run: nothing changed."
else
  echo "Caps Lock mode is on. Hold Caps Lock instead of Super."
fi

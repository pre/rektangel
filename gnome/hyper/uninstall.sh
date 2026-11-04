#!/usr/bin/env bash
# Turns off the Rektangel Caps Lock mode for the current user:
#  1. sets the Rektangel setting super-key to super,
#  2. removes the option rektangel:caps_hyper from xkb-options,
#  3. removes the Rektangel XKB files, or the Rektangel lines from the
#     user XKB files.
# Other xkb-options and other lines in the XKB files stay.
#
# Usage: uninstall.sh [--dry-run]
# Needs: gsettings, dconf, gjs. No root. Uses /usr/bin/gsettings,
# /usr/bin/dconf and /usr/bin/gjs when they exist, see common.sh.
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
parse_args "$@"
check_schema
check_backend

set_super_key super
xkb_option remove

if $dry_run; then
  echo "Dry run: nothing changed."
else
  echo "Caps Lock mode is off."
fi

#!/usr/bin/env bash
# Compiles a keymap with the Caps Lock mode symbols, offline, and checks
# the result. Does not change the keymap of the session.
# Usage: test/xkb-check.sh   Needs: xkbcomp
set -euo pipefail

gnome_dir="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="$(mktemp -d)"
trap 'rm -rf "$out_dir"' EXIT

compile() {
  xkbcomp -w 0 -I"$gnome_dir/hyper/xkb" "$@" "$gnome_dir/test/fixtures/xkb/keymap.xkb"
}
compile -xkm -o "$out_dir/keymap.xkm"
compile -xkb -o "$out_dir/keymap.xkb"

fail() {
  echo "xkb check failed: $1" >&2
  exit 1
}

caps_key=$(sed -n '/^ *key <CAPS> {/,/};/p' "$out_dir/keymap.xkb")
grep -q 'type= "TWO_LEVEL"' <<<"$caps_key" || fail "<CAPS> type is not TWO_LEVEL"
grep -Eq 'symbols\[Group1\]= \[ *Hyper_L, *Caps_Lock *\]' <<<"$caps_key" ||
  fail "<CAPS> symbols are not [ Hyper_L, Caps_Lock ]"
grep -q 'modifier_map Mod3 { <CAPS> };' "$out_dir/keymap.xkb" || fail "<CAPS> is not on Mod3"

echo "xkb check passed: <CAPS> is [ Hyper_L, Caps_Lock ], TWO_LEVEL, on Mod3"

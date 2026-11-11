#!/usr/bin/env bash
# Compiles a keymap with each Caps Lock mode variant, offline, and checks
# the result. Does not change the keymap of the session.
# Usage: test/xkb-check.sh   Needs: xkbcomp
set -euo pipefail

gnome_dir="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="$(mktemp -d)"
trap 'rm -rf "$out_dir"' EXIT

fail() {
  echo "xkb check failed: $1" >&2
  exit 1
}

# Compiles the fixture keymap with rektangel(<variant>) and prints the keymap.
compile() {
  local variant=$1
  sed "s/rektangel(caps_hyper)/rektangel($variant)/" "$gnome_dir/test/fixtures/xkb/keymap.xkb" >"$out_dir/$variant.in"
  xkbcomp -w 0 -I"$gnome_dir/hyper/xkb" -xkm -o "$out_dir/$variant.xkm" "$out_dir/$variant.in"
  xkbcomp -w 0 -I"$gnome_dir/hyper/xkb" -xkb -o "$out_dir/$variant.xkb" "$out_dir/$variant.in"
}

key() {
  sed -n "/^ *key <$2> {/,/};/p" "$out_dir/$1.xkb"
}

check_on_mod3() {
  grep -q 'modifier_map Mod3 { <CAPS> };' "$out_dir/$1.xkb" || fail "$1: <CAPS> is not on Mod3"
}

compile caps_hyper
grep -q 'type= "TWO_LEVEL"' <<<"$(key caps_hyper CAPS)" || fail "caps_hyper: <CAPS> type is not TWO_LEVEL"
grep -Eq 'symbols\[Group1\]= \[ *Hyper_L, *Caps_Lock *\]' <<<"$(key caps_hyper CAPS)" ||
  fail "caps_hyper: <CAPS> symbols are not [ Hyper_L, Caps_Lock ]"
check_on_mod3 caps_hyper

for variant in caps_hyper_only caps_hyper_both_shifts; do
  compile "$variant"
  grep -Eq '(symbols\[Group1\]= )?\[ *Hyper_L *\]' <<<"$(key "$variant" CAPS)" || fail "$variant: <CAPS> is not [ Hyper_L ]"
  grep -q 'Caps_Lock' <<<"$(key "$variant" CAPS)" && fail "$variant: <CAPS> has Caps_Lock"
  check_on_mod3 "$variant"
done

grep -q 'Caps_Lock' <<<"$(key caps_hyper_only LFSH)" && fail "caps_hyper_only: <LFSH> has Caps_Lock"
for shift in LFSH RTSH; do
  grep -Eq '\[ *Shift_[LR], *Caps_Lock *\]' <<<"$(key caps_hyper_both_shifts "$shift")" ||
    fail "caps_hyper_both_shifts: <$shift> is not [ Shift, Caps_Lock ]"
done

echo "xkb check passed: caps_hyper is [ Hyper_L, Caps_Lock ]; caps_hyper_only and caps_hyper_both_shifts are [ Hyper_L ]; both Shift keys are Caps_Lock at level 2 in caps_hyper_both_shifts; all on Mod3"

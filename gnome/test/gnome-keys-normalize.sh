#!/usr/bin/env bash
# Checks the jq normalizer of gnome-keys.sh with the pairs in
# fixtures/accelerators.json, the same pairs as the TypeScript test.
# Usage: test/gnome-keys-normalize.sh   Needs: jq
set -euo pipefail

gnome_dir="$(cd "$(dirname "$0")/.." && pwd)"
fixture="$gnome_dir/test/fixtures/accelerators.json"

actual=$(jq -r '.[].input' "$fixture" | bash "$gnome_dir/gnome-keys.sh" --normalize)
expected=$(jq -r '.[].canonical' "$fixture")
if [[ "$actual" != "$expected" ]]; then
  echo "gnome-keys.sh normalize test failed:" >&2
  diff <(jq -r '.[].input' "$fixture" | paste - <(echo "$expected")) \
    <(jq -r '.[].input' "$fixture" | paste - <(echo "$actual")) >&2 || true
  exit 1
fi
echo "gnome-keys.sh normalize test passed: $(jq length "$fixture") accelerators"

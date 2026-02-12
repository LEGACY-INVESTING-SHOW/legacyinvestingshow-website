#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CANONICAL_REPO="${CANONICAL_REPO:-$REPO_ROOT}"
CMS_REPO="${CMS_REPO:-$REPO_ROOT/cms}"

SRC_DIR="${CANONICAL_REPO}/content/blog"
DST_DIR="${CMS_REPO}/src/blog"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "ERROR: missing source dir: $SRC_DIR" >&2
  exit 1
fi

if [[ ! -d "$DST_DIR" ]]; then
  echo "ERROR: missing destination dir: $DST_DIR" >&2
  exit 1
fi

SRC_LIST=$(mktemp)
DST_LIST=$(mktemp)
trap 'rm -f "$SRC_LIST" "$DST_LIST"' EXIT

find "$SRC_DIR" -maxdepth 1 -name '*.md' -exec basename {} .md \; | sort > "$SRC_LIST"
find "$DST_DIR" -maxdepth 1 -name '*.md' -exec basename {} .md \; | sort > "$DST_LIST"

SRC_COUNT=$(wc -l < "$SRC_LIST" | tr -d ' ')
DST_COUNT=$(wc -l < "$DST_LIST" | tr -d ' ')

echo "Canonical markdown count: $SRC_COUNT"
echo "CMS markdown count:       $DST_COUNT"

echo
if ! comm -23 "$SRC_LIST" "$DST_LIST" | sed '/^$/d' | sed 's/^/missing in CMS: /'; then
  true
fi
if ! comm -13 "$SRC_LIST" "$DST_LIST" | sed '/^$/d' | sed 's/^/missing in canonical: /'; then
  true
fi

DIFF_COUNT=0
while IFS= read -r slug; do
  src_file="$SRC_DIR/$slug.md"
  dst_file="$DST_DIR/$slug.md"
  if [[ -f "$dst_file" ]] && ! cmp -s "$src_file" "$dst_file"; then
    if [[ "$DIFF_COUNT" -eq 0 ]]; then
      echo
      echo "content mismatches:"
    fi
    echo "  $slug.md"
    DIFF_COUNT=$((DIFF_COUNT + 1))
  fi
done < "$SRC_LIST"

if [[ "$DIFF_COUNT" -eq 0 ]]; then
  echo
  echo "OK: byte-level parity is clean for shared markdown files."
else
  echo
  echo "ERROR: $DIFF_COUNT markdown files differ." >&2
  exit 2
fi

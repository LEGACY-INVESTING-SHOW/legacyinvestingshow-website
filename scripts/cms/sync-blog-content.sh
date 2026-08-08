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

echo "Syncing markdown from canonical -> CMS"
echo "  source: $SRC_DIR"
echo "  dest:   $DST_DIR"

# Vercel build environment does not provide rsync by default.
# Keep this sync step POSIX-tooling only.
find "$DST_DIR" -maxdepth 1 -type f -name '*.md' -delete
find "$SRC_DIR" -maxdepth 1 -type f -name '*.md' -print0 | while IFS= read -r -d '' src_file; do
  cp "$src_file" "$DST_DIR/"
done

echo "Sync complete."

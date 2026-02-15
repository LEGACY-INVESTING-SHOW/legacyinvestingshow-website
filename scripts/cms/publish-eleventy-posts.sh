#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CMS_REPO="${CMS_REPO:-$REPO_ROOT/cms}"
CMS_BLOG_DIR="$CMS_REPO/_site/blog"
ROOT_BLOG_DIR="$REPO_ROOT/blog"
CMS_SRC_DIR="$CMS_REPO/src/blog"

if [[ ! -d "$CMS_BLOG_DIR" ]]; then
  echo "ERROR: missing built CMS blog directory: $CMS_BLOG_DIR" >&2
  echo "Run: npm run cms:build" >&2
  exit 1
fi

if [[ ! -d "$ROOT_BLOG_DIR" ]]; then
  echo "ERROR: missing website blog directory: $ROOT_BLOG_DIR" >&2
  exit 1
fi

published=0
while IFS= read -r -d '' src_file; do
  slug="$(basename "$(dirname "$src_file")")"
  dst_file="$ROOT_BLOG_DIR/$slug.html"
  cp "$src_file" "$dst_file"
  published=$((published + 1))
done < <(find "$CMS_BLOG_DIR" -mindepth 2 -maxdepth 2 -name 'index.html' -print0)

expected="$(find "$CMS_SRC_DIR" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')"

echo "Published CMS blog posts into website/blog:"
echo "  expected:  $expected"
echo "  published: $published"

if [[ "$published" != "$expected" ]]; then
  echo "ERROR: published post count does not match CMS source markdown count." >&2
  exit 2
fi

echo "CMS publish step complete."

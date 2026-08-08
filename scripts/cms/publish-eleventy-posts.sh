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
published_list="$(mktemp)"
find "$CMS_BLOG_DIR" -mindepth 2 -maxdepth 2 -name 'index.html' -print0 > "$published_list"
while IFS= read -r -d '' src_file; do
  slug="$(basename "$(dirname "$src_file")")"
  dst_file="$ROOT_BLOG_DIR/$slug.html"
  if [[ ! -f "$src_file" ]]; then
    echo "Warning: source file not found, skipping: $src_file" >&2
    continue
  fi
  cp "$src_file" "$dst_file"

  # Local file opens (file://) cannot resolve absolute /assets/... paths.
  # Rewrite to ../assets/... which works both on file:// and on https://.../blog/<slug>.
  node - "$dst_file" <<'EOF'
const fs = require('fs');

const filePath = process.argv[2];
let html = fs.readFileSync(filePath, 'utf8');

html = html.replace(/(href|src|srcset)="\/assets\//g, '$1="../assets/');
html = html.replace(/url\(\s*\/assets\//g, 'url(../assets/');

fs.writeFileSync(filePath, html, 'utf8');
EOF

  published=$((published + 1))
done < "$published_list"
rm -f "$published_list"

expected="$(find "$CMS_SRC_DIR" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')"

echo "Published CMS blog posts into website/blog:"
echo "  expected:  $expected"
echo "  published: $published"

if [[ "$published" != "$expected" ]]; then
  echo "ERROR: published post count does not match CMS source markdown count." >&2
  exit 2
fi

echo "CMS publish step complete."

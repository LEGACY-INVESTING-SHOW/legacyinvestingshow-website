#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CMS_REPO="${CMS_REPO:-$REPO_ROOT/cms}"
SITE_DIR="${CMS_REPO}/_site"
SRC_DIR="${CMS_REPO}/src/blog"
BLOG_DIR="${SITE_DIR}/blog"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

check_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -Eq "$pattern" "$file"; then
    echo "PASS: $label"
  else
    fail "$label missing in $file"
  fi
}

if [[ ! -d "$SITE_DIR" ]]; then
  fail "missing Eleventy output directory: $SITE_DIR"
fi

if [[ ! -d "$SRC_DIR" ]]; then
  fail "missing CMS source directory: $SRC_DIR"
fi

if [[ ! -d "$BLOG_DIR" ]]; then
  fail "missing built blog directory: $BLOG_DIR"
fi

expected_count=$(find "$SRC_DIR" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
built_count=$(find "$BLOG_DIR" -mindepth 2 -maxdepth 2 -name 'index.html' | wc -l | tr -d ' ')

echo "Expected blog pages: $expected_count"
echo "Built blog pages:    $built_count"

if [[ "$expected_count" != "$built_count" ]]; then
  fail "built page count does not match source markdown count"
fi

sample_file="${BLOG_DIR}/getting-started-airbnb-arbitrage/index.html"
if [[ ! -f "$sample_file" ]]; then
  sample_file=$(find "$BLOG_DIR" -mindepth 2 -maxdepth 2 -name 'index.html' | head -n 1)
fi

if [[ -z "${sample_file:-}" || ! -f "$sample_file" ]]; then
  fail "could not find any built blog post html file for smoke checks"
fi

echo "Sample file: $sample_file"

check_pattern "$sample_file" "<title>.+Legacy Investing Show</title>" "title tag"
check_pattern "$sample_file" "<meta[[:space:]]+name=\"description\"[[:space:]]+content=\"[^\"]+\"" "meta description"
check_pattern "$sample_file" "<meta[[:space:]]+name=\"keywords\"[[:space:]]+content=\"[^\"]+\"" "meta keywords non-empty"
check_pattern "$sample_file" "<link[[:space:]]+rel=\"canonical\"[[:space:]]+href=\"https?://[^\"]+\"" "canonical url"
check_pattern "$sample_file" "<meta[[:space:]]+property=\"article:published_time\"[[:space:]]+content=\"[0-9]{4}-[0-9]{2}-[0-9]{2}T" "article published time iso"
check_pattern "$sample_file" "<meta[[:space:]]+property=\"og:title\"[[:space:]]+content=\"[^\"]+\"" "og:title"
check_pattern "$sample_file" "<meta[[:space:]]+property=\"og:description\"[[:space:]]+content=\"[^\"]+\"" "og:description"
check_pattern "$sample_file" "<meta[[:space:]]+property=\"og:image\"[[:space:]]+content=\"https?://[^\"]+\"" "og:image absolute url"
check_pattern "$sample_file" "<meta[[:space:]]+name=\"twitter:card\"[[:space:]]+content=\"summary_large_image\"" "twitter card"
check_pattern "$sample_file" "<script[[:space:]]+type=\"application/ld\\+json\">" "json-ld schema"
check_pattern "$sample_file" "\"@type\"[[:space:]]*:[[:space:]]*\"Organization\"" "organization schema"

h1_count=$(grep -Eoi '<h1([[:space:]][^>]*)?>' "$sample_file" | wc -l | tr -d ' ')
echo "H1 count: $h1_count"
if [[ "$h1_count" != "1" ]]; then
  fail "expected exactly one h1 in sample file"
fi

echo "CMS Eleventy smoke checks passed."

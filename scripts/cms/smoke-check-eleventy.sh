#!/usr/bin/env bash
set -euo pipefail

CMS_REPO="${CMS_REPO:-/Users/deveshdhardubey/legacy-content-cms}"
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

  if rg -q --pcre2 "$pattern" "$file"; then
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
check_pattern "$sample_file" "<meta\\s+name=\"description\"\\s+content=\"[^\"]+\"" "meta description"
check_pattern "$sample_file" "<meta\\s+name=\"keywords\"\\s+content=\"[^\"]+\"" "meta keywords non-empty"
check_pattern "$sample_file" "<link\\s+rel=\"canonical\"\\s+href=\"https?://[^\"]+\"" "canonical url"
check_pattern "$sample_file" "<meta\\s+property=\"article:published_time\"\\s+content=\"[0-9]{4}-[0-9]{2}-[0-9]{2}T" "article published time iso"
check_pattern "$sample_file" "<meta\\s+property=\"og:title\"\\s+content=\"[^\"]+\"" "og:title"
check_pattern "$sample_file" "<meta\\s+property=\"og:description\"\\s+content=\"[^\"]+\"" "og:description"
check_pattern "$sample_file" "<meta\\s+property=\"og:image\"\\s+content=\"https?://[^\"]+\"" "og:image absolute url"
check_pattern "$sample_file" "<meta\\s+name=\"twitter:card\"\\s+content=\"summary_large_image\"" "twitter card"
check_pattern "$sample_file" "<script\\s+type=\"application/ld\\+json\">" "json-ld schema"
check_pattern "$sample_file" "\"@type\"\\s*:\\s*\"Organization\"" "organization schema"

h1_count=$(rg -o "<h1\\b" "$sample_file" | wc -l | tr -d ' ')
echo "H1 count: $h1_count"
if [[ "$h1_count" != "1" ]]; then
  fail "expected exactly one h1 in sample file"
fi

echo "CMS Eleventy smoke checks passed."

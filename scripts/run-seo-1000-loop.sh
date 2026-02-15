#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TOPICS_FILE="${TOPICS_FILE:-data/seo-topics-1000.json}"
BATCH_SIZE="${BATCH_SIZE:-3}"
PHASE="${PHASE:-80-20}"
MIN_WORDS="${MIN_WORDS:-1500}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
MODEL="${SEO_LLM_MODEL:-gpt-5.3-codex}"
PUBLISH_EVERY="${PUBLISH_EVERY:-1}"
DRY_RUN="${DRY_RUN:-0}"
SLEEP_BETWEEN="${SLEEP_BETWEEN:-2}"

if [[ ! -f "$TOPICS_FILE" ]]; then
  echo "Topics file not found: $TOPICS_FILE"
  exit 1
fi

iteration=0

while true; do
  pending=$(node -e "const d=require('./${TOPICS_FILE}');const all=Object.values(d.categories||{}).flatMap(c=>c.topics||[]);const p=all.filter(t=>t.status!=='completed'&&t.status!=='covered'&&('${PHASE}'==='all'||'${PHASE}'==='p3'||('${PHASE}'==='p1'&&t.priority==='P1')||('${PHASE}'==='p2'&&t.priority==='P2')||(('${PHASE}'==='80-20'||'${PHASE}'==='phase1')&&(t.priority==='P1'||t.priority==='P2')))).length;console.log(p);")

  echo "[loop] pending (${PHASE}): ${pending}"
  if [[ "$pending" -le 0 ]]; then
    break
  fi

  set +e
  if [[ "$DRY_RUN" == "1" ]]; then
    output=$(node scripts/generate-seo-llm-batch.js --topics-file "$TOPICS_FILE" --phase "$PHASE" --limit "$BATCH_SIZE" --min-words "$MIN_WORDS" --max-attempts "$MAX_ATTEMPTS" --model "$MODEL" --dry-run 2>&1)
    status=$?
  else
    output=$(node scripts/generate-seo-llm-batch.js --topics-file "$TOPICS_FILE" --phase "$PHASE" --limit "$BATCH_SIZE" --min-words "$MIN_WORDS" --max-attempts "$MAX_ATTEMPTS" --model "$MODEL" 2>&1)
    status=$?
  fi
  set -e

  echo "$output"

  if [[ "$status" -ne 0 ]]; then
    echo "[loop] batch generator failed (exit ${status}); retrying in 15s"
    sleep 15
    continue
  fi

  created=$(echo "$output" | awk '/^Created:/ {print $2}' | tail -1)
  failed=$(echo "$output" | awk '/^Failed:/ {print $2}' | tail -1)
  created=${created:-0}
  failed=${failed:-0}

  iteration=$((iteration + 1))

  if (( iteration % PUBLISH_EVERY == 0 )); then
    echo "[loop] publishing CMS output"
    npm run cms:sync:blog
    npm run cms:build
    npm run cms:publish:posts
    npm run build:sitemap
    npm run build:rss
  fi

  if [[ "$created" -eq 0 && "$failed" -gt 0 ]]; then
    echo "[loop] no new pages created this iteration; continuing"
  fi

  sleep "$SLEEP_BETWEEN"
done

echo "[loop] done"

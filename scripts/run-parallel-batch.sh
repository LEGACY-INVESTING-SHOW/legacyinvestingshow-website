#!/bin/bash
# Run parallel batch on SEPARATE category file
# Usage: ./run-parallel-batch.sh CATEGORY_KEY

CATEGORY_KEY=$1
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TOPICS_FILE="data/seo-topics-${CATEGORY_KEY}.json"
BATCH_SIZE=5
MIN_WORDS=1500
MODEL="${SEO_LLM_MODEL:-gpt-5.3-codex}"

echo "[batch-$CATEGORY_KEY] Starting with $TOPICS_FILE"

while true; do
  PENDING=$(node -e "
    const d = require('./$TOPICS_FILE');
    const cat = Object.values(d.categories)[0];
    const pending = cat.topics.filter(t => t.status !== 'completed' && t.status !== 'covered');
    console.log(pending.length);
  ")
  
  if [ "$PENDING" -eq 0 ]; then
    echo "[batch-$CATEGORY_KEY] Complete! No more pending."
    break
  fi
  
  echo "[batch-$CATEGORY_KEY] Pending: $PENDING"
  
  node scripts/generate-seo-llm-batch.js \
    --topics-file "$TOPICS_FILE" \
    --limit "$BATCH_SIZE" \
    --min-words "$MIN_WORDS" \
    --model "$MODEL" 2>&1
  
  if [ $? -ne 0 ]; then
    echo "[batch-$CATEGORY_KEY] Failed, retrying in 10s"
    sleep 10
    continue
  fi
  
  sleep 2
done

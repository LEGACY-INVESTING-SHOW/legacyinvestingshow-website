#!/bin/bash
# Continuous publisher - syncs and publishes content every 60 seconds

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[publisher] Starting continuous publisher"

while true; do
  sleep 60
  
  echo "[publisher] Syncing blog content..."
  npm run cms:sync:blog 2>/dev/null
  
  echo "[publisher] Building CMS..."
  npm run cms:build 2>/dev/null
  
  echo "[publisher] Publishing posts..."
  npm run cms:publish:posts 2>/dev/null
  
  echo "[publisher] Updating sitemap and RSS..."
  npm run build:sitemap 2>/dev/null
  npm run build:rss 2>/dev/null
  
  echo "[publisher] Done - next cycle in 60s"
done

#!/bin/bash
# Mission initialization script - idempotent
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing dependencies..."
npm install

echo "Checking Python dependencies for PDF/DOCX extraction..."
python3 -c "import fitz" 2>/dev/null || {
  echo "Installing PyMuPDF for PDF extraction..."
  python3 -m pip install PyMuPDF --quiet
}

echo "Init complete."

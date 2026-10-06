#!/bin/bash
# Package the extension for Chrome Web Store submission
# Run from the repository root: ./store/package.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="$ROOT_DIR/reddit-to-md.zip"

cd "$ROOT_DIR"

# Remove old package if it exists
rm -f "$OUTPUT_FILE"

# Create zip with only the extension files
zip -r "$OUTPUT_FILE" \
    manifest.json \
    content.js \
    styles.css \
    icons/ \
    -x "*.DS_Store" \
    -x "*__MACOSX*"

echo "Created: $OUTPUT_FILE"
echo ""
echo "Contents:"
unzip -l "$OUTPUT_FILE"

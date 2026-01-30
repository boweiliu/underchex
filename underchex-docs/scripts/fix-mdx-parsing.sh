#!/usr/bin/env bash
set -e

# Fix MDX parsing errors by escaping < followed by numbers
# This handles cases like "<10" which MDX interprets as invalid HTML tags

DOCS_DIR="docs"

echo "Fixing MDX parsing errors in $DOCS_DIR..."

# Find all markdown files and replace <DIGIT with &lt;DIGIT
find "$DOCS_DIR" -name "*.md" -type f | while read -r file; do
  # Check if file contains the pattern
  if grep -q '<[0-9]' "$file"; then
    echo "Fixing: $file"
    sed -i '' 's/<\([0-9]\)/\&lt;\1/g' "$file"
  fi
done

# Also fix <= patterns
find "$DOCS_DIR" -name "*.md" -type f | while read -r file; do
  if grep -q '<=' "$file" 2>/dev/null; then
    echo "Fixing <= in: $file"
    sed -i '' 's/<=/\&lt;=/g' "$file"
  fi
done

echo "Done! Run 'npx mint validate' to check for remaining errors."

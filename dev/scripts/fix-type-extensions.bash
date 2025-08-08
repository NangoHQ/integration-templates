#!/bin/bash

# Usage: ./fix-type-extensions.bash <directory>
# Example: ./fix-type-extensions.bash ./src

if [ -z "$1" ]; then
  echo "Usage: $0 <directory>"
  exit 1
fi

TARGET_DIR="$1"

# Find all .ts and .tsx files recursively
find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  if grep -qE "import[[:space:]]+type[[:space:]]+\{[^}]*\}[[:space:]]+from[[:space:]]+['\"]\.[^'\"]*['\"];?" "$file"; then
    echo "[FIXING] $file"
    # Only add .js if not already present before the quote
    sed -i "" -E "/import[[:space:]]+type[[:space:]]+\{[^}]*\}[[:space:]]+from[[:space:]]+['\"]\.[^'\"]*['\"];?/s|from[[:space:]]+(['\"])(\.[^'\"]*)([^.])(['\"];)|from \1\2\3.js\4|g" "$file"
    # Remove accidental double .js.js
    sed -i "" -E "s|(.js)\.js(['\"];)|\1\2|g" "$file"
  fi
done


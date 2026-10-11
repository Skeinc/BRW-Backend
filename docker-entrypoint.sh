#!/bin/sh
set -e
# Run migrations only when at least one has been generated (stage 3 adds the first one).
if [ -f drizzle/meta/_journal.json ]; then
  npx drizzle-kit migrate
else
  echo "No drizzle migrations yet, skipping migrate"
fi
exec node dist/main.js

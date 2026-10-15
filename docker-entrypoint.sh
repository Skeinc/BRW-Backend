#!/bin/sh
set -e
# Apply pending migrations on every start (nothing happens when the database is up to date).
if [ -f drizzle/meta/_journal.json ]; then
  npx drizzle-kit migrate
else
  echo "No drizzle migrations yet, skipping migrate"
fi
exec node dist/main.js

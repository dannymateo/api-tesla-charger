#!/bin/sh
set -e

run_migrate() {
  npm run prisma:migrate:deploy 2>&1
}

OUTPUT=$(run_migrate) && {
  echo "$OUTPUT"
  exit 0
}

echo "$OUTPUT"

if echo "$OUTPUT" | grep -q 'P3005'; then
  echo "Non-empty database without migration history; syncing schema..."
  npx prisma db push
  MIGRATION_NAME=$(ls -1 prisma/migrations 2>/dev/null | head -1)
  if [ -n "$MIGRATION_NAME" ]; then
    npx prisma migrate resolve --applied "$MIGRATION_NAME" || true
  fi
  run_migrate
  exit 0
fi

exit 1

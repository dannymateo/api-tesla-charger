#!/bin/sh
set -e

DB_WAIT_MSG="${1:-database}"

until /app/prisma-migrate-deploy.sh; do
  echo "waiting for ${DB_WAIT_MSG}"
  sleep 2
done

export VOLTNET_IDS_PATH="${VOLTNET_IDS_PATH:-/app/docker/seed/voltnet-ids.json}"

if [ -f /app/prisma/schema.prisma ]; then
  echo "Running prisma db seed..."
  npx prisma db seed
fi

exec node dist/src/main.js

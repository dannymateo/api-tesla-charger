#!/bin/sh
set -e

DB_WAIT_MSG="${1:-database}"

until /app/prisma-migrate-deploy.sh; do
  echo "waiting for ${DB_WAIT_MSG}"
  sleep 2
done

export VOLTNET_SEED_DIR="${VOLTNET_SEED_DIR:-/app/docker/seed}"
export VOLTNET_IDS_PATH="${VOLTNET_IDS_PATH:-${VOLTNET_SEED_DIR}/voltnet-ids.json}"

if [ -f /app/prisma/schema.prisma ]; then
  echo "Running prisma db seed..."
  npx prisma db seed
fi

exec node dist/src/main.js

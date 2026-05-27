#!/bin/sh
set -e

ROOT="/app"
cd "${ROOT}"

# node_modules del host (Windows) se sustituye por volumen anonimo en compose; instalar si falta Prisma.
ensure_linux_deps() {
  service="$1"
  if [ ! -d "${ROOT}/${service}/node_modules/@prisma/client" ]; then
    echo "Installing Linux dependencies for ${service}..."
    (cd "${ROOT}/${service}" && npm install)
  fi
}

seed_service() {
  service="$1"
  database_url="$2"
  ensure_linux_deps "${service}"
  echo "==> Seeding ${service}..."
  (
    cd "${ROOT}/${service}"
    export VOLTNET_IDS_PATH="${ROOT}/docker/seed/voltnet-ids.json"
    npx prisma generate
    DATABASE_URL="${database_url}" npx prisma migrate deploy 2>/dev/null \
      || DATABASE_URL="${database_url}" npx prisma db push
    DATABASE_URL="${database_url}" npx prisma db seed
  )
}

AUTH_URL="${AUTH_DATABASE_URL:-postgresql://auth:auth@auth-db:5432/auth_db?schema=public}"
STATIONS_URL="${STATIONS_DATABASE_URL:-postgresql://stations:stations@stations-db:5432/stations_db?schema=public}"
SESSIONS_URL="${SESSIONS_DATABASE_URL:-postgresql://sessions:sessions@sessions-db:5432/sessions_db?schema=public}"
BILLING_URL="${BILLING_DATABASE_URL:-postgresql://billing:billing@billing-db:5432/billing_db?schema=public}"

seed_service auth-service "${AUTH_URL}"
seed_service stations-service "${STATIONS_URL}"
seed_service sessions-service "${SESSIONS_URL}"
seed_service billing-service "${BILLING_URL}"

echo ""
echo "Tesla Supercharger seed completed (docker)."
echo "  admin@tesla.local / Tesla123!  (ADMIN)"
echo "  driver@tesla.local / Tesla123!"
echo "  maria@tesla.local / Tesla123!"
echo "  blocked@tesla.local / Tesla123! (bloqueado)"

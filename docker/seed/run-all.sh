#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

AUTH_URL="${AUTH_DATABASE_URL:-postgresql://auth:auth@localhost:5433/auth_db?schema=public}"
STATIONS_URL="${STATIONS_DATABASE_URL:-postgresql://stations:stations@localhost:5434/stations_db?schema=public}"
SESSIONS_URL="${SESSIONS_DATABASE_URL:-postgresql://sessions:sessions@localhost:5435/sessions_db?schema=public}"
BILLING_URL="${BILLING_DATABASE_URL:-postgresql://billing:billing@localhost:5436/billing_db?schema=public}"

run_seed() {
  service="$1"
  database_url="$2"
  echo "==> Seeding ${service}..."
  (
    cd "${ROOT}/${service}"
    if [ ! -d node_modules ]; then
      npm install
    fi
    npx prisma generate
    DATABASE_URL="${database_url}" npx prisma db seed
  )
}

run_seed auth-service "${AUTH_URL}"
run_seed stations-service "${STATIONS_URL}"
run_seed sessions-service "${SESSIONS_URL}"
run_seed billing-service "${BILLING_URL}"

echo ""
echo "Tesla Supercharger seed completed."
echo "  admin@tesla.local / Tesla123!  (ADMIN)"
echo "  driver@tesla.local / Tesla123!"
echo "  maria@tesla.local / Tesla123!"
echo "  blocked@tesla.local / Tesla123! (bloqueado, factura OVERDUE)"

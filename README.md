# Tesla Supercharger Backend Monorepo

Monorepo de microservicios NestJS (arquitectura hexagonal) para la red **Tesla Supercharger**:

- `gateway` — API Gateway / BFF (único punto de entrada HTTP)
- `auth-service` — autenticación y usuarios
- `stations-service` — estaciones y conectores
- `sessions-service` — sesiones de carga
- `billing-service` — facturación y pagos (PayPal)
- `notification-service` — envío de correos (SMTP)

Cada servicio mantiene sus propias dependencias, estructura hexagonal, configuración y `Dockerfile`. La comunicación entre servicios es vía **RabbitMQ**; el cliente solo habla con el `gateway`.

---

Manual de instalación paso a paso para levantar el entorno completo desde la raíz del monorepo (`api-tesla-charger`).

## 1) Abrir el proyecto

Clona el repositorio y entra a la carpeta del backend:

```bash
git clone https://github.com/dannymateo/api-tesla-charger
cd tesla-charger
cd api-tesla-charger
```

## 2) Crear archivo de variables `.env`

En la raíz del monorepo (`api-tesla-charger`), copia el ejemplo y ajusta los valores:

```bash
cp .env.example .env
```

Contenido base de `.env`:

```env
NODE_ENV=development

# RabbitMQ
RABBITMQ_DEFAULT_USER=voltnet
RABBITMQ_DEFAULT_PASS=voltnet

# Bases de datos (una por servicio)
AUTH_DB_USER=auth
AUTH_DB_PASS=auth
AUTH_DB_NAME=auth_db

STATIONS_DB_USER=stations
STATIONS_DB_PASS=stations
STATIONS_DB_NAME=stations_db

SESSIONS_DB_USER=sessions
SESSIONS_DB_PASS=sessions
SESSIONS_DB_NAME=sessions_db

BILLING_DB_USER=billing
BILLING_DB_PASS=billing
BILLING_DB_NAME=billing_db

# Seguridad
JWT_SECRET=change_me

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=tu_paypal_client_id
PAYPAL_CLIENT_SECRET=tu_paypal_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_RETURN_URL=http://localhost:3001/payment/success
PAYPAL_CANCEL_URL=http://localhost:3001/payment/cancel
PAYPAL_CURRENCY=USD
PAYPAL_WEBHOOK_ID=tu_paypal_webhook_id

BILLING_WEBHOOK_BASE_URL=http://billing-service:3000
APP_URL=http://localhost:3001

# Correo (SMTP / Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_gmail@gmail.com
SMTP_PASS=tu_gmail_app_password
SMTP_FROM=Tesla Supercharger <tu_gmail@gmail.com>
APP_NAME=Tesla Supercharger

# Observabilidad (Prometheus / Grafana / Jaeger)
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces
GRAFANA_ADMIN_PASSWORD=admin
```

## 3) Levantar todo el entorno

Desde la raíz del monorepo ejecuta:

```bash
docker compose up -d --build
```

Esto levanta:

- rabbitmq (5672, UI en 15672)
- redis (6379)
- auth-db (5433 externo)
- stations-db (5434 externo)
- sessions-db (5435 externo)
- billing-db (5436 externo)
- jaeger (16686 UI, 4318 OTLP)
- prometheus (9090)
- grafana (3030)
- gateway (3000)
- auth-service
- stations-service
- sessions-service
- billing-service
- notification-service

## 4) Verificar que todo esté arriba

Ver estado de contenedores:

```bash
docker compose ps
```

Probar el health check del gateway:

```bash
curl http://localhost:3000/api/v1/health
```

Abrir Swagger (OpenAPI del gateway):

```
http://localhost:3000/docs
```

JSON de OpenAPI: `http://localhost:3000/docs-json`

## 5) Cargar datos de demo (seed)

Con la infraestructura ya levantada (las bases se migran solas al arrancar cada servicio), carga datos de ejemplo:

```bash
docker compose --profile seed up seed
```

En local (requiere `npm install` previo en cada servicio):

```bash
sh docker/seed/run-all.sh
```

O por servicio: `cd auth-service && npm run db:seed` (igual para `stations-service`, `sessions-service`, `billing-service`).

### Cuentas de prueba

| Email | Password | Rol | Notas |
|-------|----------|-----|-------|
| `admin@tesla.local` | `Tesla123!` | ADMIN | |
| `driver@tesla.local` | `Tesla123!` | USER | Factura pagada |
| `maria@tesla.local` | `Tesla123!` | USER | Factura PENDING (pago PayPal) |
| `blocked@tesla.local` | `Tesla123!` | USER | Bloqueado, factura OVERDUE |

### Estaciones (Medellín)

- Supercharger El Poblado, Estadio, Laureles (habilitadas)
- Supercharger Centro (deshabilitada, no aparece en listado público)

Precios demo en **USD/kWh**: Poblado $0.42, Estadio $0.38, Laureles $0.40.

| Usuario demo | Sesión | kWh entregados | Total factura |
|--------------|--------|----------------|---------------|
| `driver@tesla.local` | Completada (pagada) | 32 kWh | $13.44 |
| `maria@tesla.local` | Detenida (pendiente) | 22 kWh | $8.80 |
| `blocked@tesla.local` | Completada (vencida) | 28 kWh | $11.76 |

Los IDs compartidos entre servicios están en `docker/seed/voltnet-ids.json`. Tarifas y cargas en `docker/seed/demo-pricing.js`.

## 6) Observabilidad

Cada microservicio y el gateway exponen métricas Prometheus en `/metrics` y envían trazas OTLP a Jaeger.

| Herramienta | URL local | Uso |
|-------------|-----------|-----|
| Prometheus | http://localhost:9090 | Scraping de métricas (`up`, CPU, memoria, HTTP) |
| Grafana | http://localhost:3030 | Dashboard **VoltNet — Service health** (admin / `GRAFANA_ADMIN_PASSWORD`) |
| Jaeger UI | http://localhost:16686 | Trazas distribuidas (HTTP, RabbitMQ, etc.) |
| RabbitMQ | http://localhost:15672 | Panel de mensajería (`RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS`) |

## Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs -f gateway

# Detener todo
docker compose down

# Detener y borrar volúmenes (reinicio limpio de las bases)
docker compose down -v
```

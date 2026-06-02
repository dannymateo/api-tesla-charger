# Informe Arquitectónico — Tesla Supercharger Backend

**Autores:** Jean Carlos Gonzalez Goyeneche · Danny Mateo Hernández · Diego Ramirez Duque

**Proyecto:** `api-tesla-charger` — Monorepo de microservicios para la red de carga Tesla Supercharger (Medellín)

---

## 1. Resumen Ejecutivo

### Problema del caso de estudio

Tesla Supercharger requiere una plataforma backend que gestione el ciclo completo de carga de vehículos eléctricos en una red de estaciones distribuidas. El problema central no es solo exponer un CRUD de estaciones, sino coordinar en tiempo real recursos limitados (conectores, capacidad en kW), identidades de conductores, sesiones de carga activas, facturación post-sesión, cobros y notificaciones, todo ello con reglas de negocio estrictas:

- Un conductor no puede iniciar carga si la estación está deshabilitada, saturada o sin conectores libres.
- La carga solicitada no puede superar la capacidad de batería del vehículo ni el umbral máximo de la estación.
- Un usuario con facturas vencidas (> 30 días) queda bloqueado hasta regularizar su deuda.
- Al cerrar una sesión facturable se debe generar automáticamente una factura y notificar al usuario.
- Los pagos vía PayPal deben confirmarse de forma idempotente y, al saldar la deuda, desbloquear al usuario.
- El mapa de estaciones y el progreso de carga deben actualizarse en tiempo casi real para conductores y administradores.

Estos requisitos implican **concurrencia** (varios vehículos compitiendo por los mismos conectores), **consistencia de datos de negocio** (facturas, pagos, bloqueos) y **comunicación en tiempo real** (WebSocket), lo que excede las capacidades de una aplicación monolítica simple.

### Solución propuesta

Se diseñó un **monorepo de microservicios** con **arquitectura hexagonal** (puertos y adaptadores), desplegable con Docker Compose. El cliente (aplicación web o móvil) interactúa únicamente con un **API Gateway / BFF** (`gateway`, puerto 3000), que expone REST, WebSocket y documentación OpenAPI (`/docs`).

Los microservicios especializados son:

| Servicio               | Responsabilidad                                             |
| ---------------------- | ----------------------------------------------------------- |
| `auth-service`         | Registro, login JWT, perfiles, bloqueo/desbloqueo por deuda |
| `stations-service`     | CRUD de estaciones, estado operacional, precios             |
| `sessions-service`     | Inicio, progreso, detención y cierre de sesiones de carga   |
| `billing-service`      | Facturas, pagos PayPal, cron de morosidad                   |
| `notification-service` | Envío de correos transaccionales (SMTP/Gmail)               |

La comunicación **síncrona** entre servicios se realiza vía **RPC sobre RabbitMQ** (colas dedicadas por servicio). La comunicación **asíncrona** usa un **exchange topic** (`voltnet.events`) para eventos de dominio: `session.closed`, `session.progress.updated`, `station.state.changed`, `invoices.paid`, `user.debt.overdue`, `notification.send`.

**Redis** mantiene el estado en caliente de carga por estación (conectores ocupados y kW activos) para decisiones rápidas de reserva de capacidad. Cada servicio con persistencia tiene su **propia base PostgreSQL** (patrón _database per service_).

La stack de observabilidad incluye **Prometheus** (métricas), **Grafana** (dashboards) y **Jaeger** (trazas distribuidas OTLP), expuestas en los puertos 9090, 3030 y 16686 respectivamente.

---

## 2. Atributos de Calidad

Se identificaron tres atributos críticos que guían las decisiones del sistema:

### 2.1 Disponibilidad

**Definición:** El sistema debe seguir operando ante fallos parciales de componentes y permitir recuperación de sesiones de carga interrumpidas.

**Cómo se aborda en el proyecto:**

- **Desacoplamiento por microservicios:** La caída de `notification-service` no impide iniciar una sesión de carga; las notificaciones se publican de forma _fire-and-forget_ y los errores de envío no bloquean facturación ni pagos.
- **Health checks en Docker Compose:** Todos los servicios y dependencias (RabbitMQ, Redis, PostgreSQL) tienen healthchecks; Prometheus y Grafana dependen de que los servicios estén saludables antes de iniciar el scraping.
- **Colas durables y Dead Letter Exchange (`voltnet.dlx`):** Los eventos críticos (`session.closed`, `invoices.paid`, `user.debt.overdue`, emails) usan colas persistentes con DLX para no perder mensajes ante fallos transitorios del consumidor.
- **Recuperación de sesiones:** `sessions-service` al arrancar (`onModuleInit`) reanuda sesiones `IN_PROGRESS`, reconstruye la carga en Redis y continúa la simulación de progreso.
- **Idempotencia en pagos:** `PaymentApplicationService` detecta pagos ya completados y responde sin reprocesar (`idempotent: true`).

### 2.2 Latencia (tiempo de respuesta en tiempo real)

**Definición:** Las actualizaciones de progreso de carga y estado de estaciones deben llegar al cliente con mínimo retardo perceptible.

**Cómo se aborda en el proyecto:**

- **Redis como caché de estado operacional:** La reserva y liberación de conectores/kW se resuelve en memoria (`RedisStationCacheAdapter`) en lugar de consultar PostgreSQL en cada inicio de sesión.
- **Eventos efímeros de progreso:** La cola `gateway.session-progress.queue` tiene TTL de 5 segundos y `noAck: true`; los mensajes obsoletos expiran en lugar de acumularse, priorizando datos recientes sobre entrega garantizada.
- **WebSocket en el gateway:** `StationsGateway` emite `session.progress.updated` y `station.state.changed` directamente a salas (`session:{id}`, `map`, `admin`) sin que el cliente haga polling HTTP.
- **RPC con timeout acotado:** Los clientes RPC del gateway aplican timeouts de 3–5 segundos para evitar bloqueos prolongados en peticiones síncronas.

### 2.3 Integridad (consistencia de datos de negocio)

**Definición:** Facturas, pagos, bloqueos de usuario y reservas de conectores deben reflejar reglas de negocio correctas y evitar duplicados o estados inválidos.

**Cómo se aborda en el proyecto:**

- **Modelos de dominio con invariantes:** Entidades como `Invoice`, `ChargingSession`, `SessionClosedEvent` y `User` validan reglas en creación y exponen métodos semánticos (`isPayable()`, `isBillable()`, `isInProgress()`).
- **Idempotencia de eventos:** Tabla `ProcessedEvent` en `billing-service` evita procesar dos veces el mismo `session.closed`.
- **Unicidad en base de datos:** `sessionId` único en facturas; restricciones Prisma en pagos e invoices.
- **Reglas de bloqueo por deuda:** Cron diario marca facturas `OVERDUE` (> 30 días), publica `user.debt.overdue` y bloquea al usuario; al pagar, `invoices.paid` desbloquea solo si no quedan facturas vencidas.
- **Validaciones previas a reservar:** Antes de reservar capacidad en Redis, `sessions-service` consulta estado de estación vía RPC, perfil del usuario y sesiones activas, rechazando con códigos explícitos (`NO_CONNECTORS`, `USER_BLOCKED_DEBT`, `NETWORK_SATURATED`, etc.).

---

## 3. Decisiones Arquitectónicas

### 3.1 Lenguaje y framework: TypeScript + NestJS

| Decisión       | Justificación                                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript** | Tipado estático que reduce errores en contratos entre capas (dominio, puertos, DTOs). Facilita refactor en un monorepo con múltiples servicios.                                                                                                                       |
| **NestJS**     | Framework modular con inyección de dependencias nativa, soporte first-class para microservicios (Transport.RMQ), WebSockets (Socket.IO), scheduling (`@Cron`) y interceptores. Permite implementar arquitectura hexagonal con `{ provide: Port, useClass: Adapter }`. |
| **Monorepo**   | Un repositorio con servicios independientes (`gateway`, `auth-service`, etc.), cada uno con su `package.json`, `Dockerfile` y esquema Prisma. Simplifica desarrollo local y despliegue coordinado vía `docker compose`.                                               |

La arquitectura hexagonal documentada en `ARCHITECTURE.md` separa `domain` → `application` (puertos) → `infrastructure` (adaptadores), garantizando inversión de dependencias y testabilidad.

### 3.2 Bases de datos: PostgreSQL 16 (una por servicio) + Prisma ORM

| Servicio           | Base de datos | Puerto externo |
| ------------------ | ------------- | -------------- |
| `auth-service`     | `auth_db`     | 5433           |
| `stations-service` | `stations_db` | 5434           |
| `sessions-service` | `sessions_db` | 5435           |
| `billing-service`  | `billing_db`  | 5436           |

**Justificación:**

- **PostgreSQL:** ACID, tipos decimales precisos para montos (`Decimal` en facturas/pagos), madurez y amplio soporte en producción.
- **Database per service:** Cada bounded context posee su esquema independiente; evita acoplamiento de tablas y permite escalar o migrar servicios por separado.
- **Prisma:** Migraciones versionadas (`prisma/migrations`), mapeo tipado y seeds de demo (`docker/seed/`). Los repositorios (`PrismaBillingRepository`, `PrismaSessionRepository`) actúan como adaptadores del puerto de persistencia.

**Redis 7** complementa PostgreSQL exclusivamente para estado volátil de carga por estación (conectores ocupados, kW activos), no como fuente de verdad transaccional.

### 3.3 Broker de mensajería: RabbitMQ 3.13

**Justificación:**

- **RPC síncrono entre servicios:** Colas dedicadas (`auth.rpc.queue`, `stations.rpc.queue`, `sessions.rpc.queue`, `billing.rpc.queue`) con NestJS `Transport.RMQ` y `ClientProxyFactory`.
- **Eventos asíncronos desacoplados:** Exchange topic `voltnet.events` con routing keys semánticas permite que múltiples consumidores reaccionen al mismo evento sin conocerse entre sí (Observer / pub-sub).
- **Confiabilidad configurable:** Colas críticas durables + DLX; cola de progreso efímera con TTL para latencia.
- **Panel de gestión:** UI en puerto 15672 para inspeccionar colas, bindings y mensajes en desarrollo.
- **Definiciones declarativas:** `docker/rabbitmq/definitions.json` versiona exchanges, colas y bindings de forma reproducible.

Flujo event-driven principal:

```
sessions-service  ──session.closed──►  billing-service  (genera factura)
billing-service   ──invoices.paid──►  auth-service      (desbloquea usuario)
billing-service   ──user.debt.overdue─► auth-service     (bloquea usuario)
sessions-service  ──session.progress─► gateway           (WebSocket al cliente)
stations-service  ──station.state──► gateway           (mapa en tiempo real)
*                 ──notification.send─► notification-service (email SMTP)
```

### 3.4 API Gateway como único punto de entrada

**Justificación:**

- Oculta la topología interna de microservicios al cliente.
- Centraliza autenticación JWT (`JwtTokenVerifier`) y autorización por rol (ADMIN vs USER).
- Agrega capacidades transversales: OpenAPI/Swagger, métricas HTTP, consumidores RabbitMQ para WebSocket.
- El webhook de PayPal debe registrar una URL pública (`/api/v1/payments/paypal/webhook`). El gateway reenvía el evento por HTTP interno a `billing-service`, donde se verifica la firma y se confirma el pago. El microservicio de facturación concentra la lógica; el gateway actúa como único punto de entrada externo sin duplicar reglas de negocio.

### 3.5 Integraciones externas

| Integración    | Tecnología                           | Rol                                          |
| -------------- | ------------------------------------ | -------------------------------------------- |
| Pagos          | PayPal REST API (Sandbox)            | Checkout, captura y verificación de webhooks |
| Correo         | SMTP (Gmail)                         | Notificaciones de registro, factura y pago   |
| Observabilidad | Prometheus + Grafana + Jaeger (OTLP) | Métricas, dashboards y trazas distribuidas   |

### 3.6 Contenedorización: Docker Compose

Todo el entorno (infra + 6 servicios) se levanta con `docker compose up -d --build`. Healthchecks, volúmenes persistentes y perfil `seed` para datos demo garantizan reproducibilidad entre desarrolladores y evaluadores.

---

## 4. Trade-offs

Al elegir microservicios event-driven con bases de datos separadas, el proyecto **gana** en escalabilidad independiente, resiliencia parcial y separación de responsabilidades, pero **sacrifica** simplicidad operativa y consistencia global inmediata.

### 4.1 Consistencia eventual vs. consistencia fuerte

| Qué se sacrifica                                                         | Qué se gana                                   | Evidencia en el proyecto                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| No hay transacciones distribuidas (2PC) entre servicios                  | Servicios autónomos desplegables por separado | Factura creada vía evento `session.closed`, no en la misma TX que el cierre de sesión |
| Estado de estación en Redis puede divergir momentáneamente de PostgreSQL | Reservas de conector en microsegundos         | `RedisStationCacheAdapter` vs. datos maestros en `stations-db`                        |
| Notificaciones y emails pueden fallar sin rollback de factura            | Flujo de facturación no se bloquea            | `void this.notifyInvoiceCreated(...)` con try/catch silencioso                        |

**Mitigación:** Idempotencia (`ProcessedEvent`), re-sincronización al arrancar (`recoverInProgressSessions`), publicación de estado tras cambios (`publishStationState`).

### 4.2 Complejidad operativa vs. modularidad

| Qué se sacrifica                                                     | Qué se gana                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| 6 servicios + 4 PostgreSQL + RabbitMQ + Redis + stack observabilidad | Cada equipo/contexto evoluciona sin tocar el monolito |
| Debugging distribuido (requiere Jaeger/trazas)                       | Fallos aislados: notification caído ≠ sessions caído  |
| Mayor superficie de configuración (`.env`, colas, bindings)          | Despliegue reproducible con Docker Compose            |

### 4.3 Latencia de comunicación vs. desacoplamiento

| Qué se sacrifica                                                                                | Qué se gana                                             |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Latencia adicional en operaciones síncronas (gateway → RPC → servicio → posible RPC encadenado) | Contratos loose coupling vía colas RPC                  |
| Timeouts y posibles reintentos en cadena                                                        | El cliente no conoce ni depende de la topología interna |

Ejemplo: iniciar sesión implica RPC a `stations-service`, `auth-service`, escritura en Redis y PostgreSQL — más lento que un monolito, pero cada paso es independiente y escalable.

### 4.4 Entrega garantizada vs. frescura de datos en tiempo real

| Qué se sacrifica                                                              | Qué se gana                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Mensajes de progreso pueden perderse (cola no durable, TTL 5s, `noAck: true`) | El cliente siempre recibe el estado más reciente, no un backlog obsoleto |
| No hay garantía de entrega de cada tick de progreso                           | Menor carga en RabbitMQ y gateway bajo alta concurrencia                 |

Esta decisión es coherente con el atributo de **latencia** sobre **durabilidad** para eventos de UI en tiempo real.

### 4.5 Consistencia cross-service de identificadores

| Qué se sacrifica                                                                             | Qué se gana                             |
| -------------------------------------------------------------------------------------------- | --------------------------------------- |
| No hay FK entre bases de distintos servicios (`userId`, `stationId` son referencias lógicas) | Autonomía total de esquemas             |
| Requiere convención de IDs compartidos (seed en `docker/seed/voltnet-ids.json`)              | Migraciones independientes por servicio |

### 4.6 Simulación de carga vs. integración con hardware real

| Qué se sacrifica                                         | Qué se gana                                               |
| -------------------------------------------------------- | --------------------------------------------------------- |
| No hay integración con cargadores físicos OCPP/Modbus    | Demostración completa del dominio de negocio sin hardware |
| Progreso simulado con timers (`CHARGE_RATE_KWH_PER_SEC`) | Pruebas reproducibles (`test-multi-vehicle-charging.js`)  |

---

## 5. Diagrama C4 — Nivel 1 y Nivel 2

El modelo [C4](https://c4model.com/) describe la arquitectura en niveles de abstracción creciente. Para este backend se documentan los dos primeros:

| Nivel | Nombre | Qué representa en Tesla Supercharger |
|-------|--------|--------------------------------------|
| **1** | Contexto del sistema | Actores externos (conductor, administrador), el sistema **Tesla Supercharger Backend** como caja negra y sistemas colaboradores (PayPal, SMTP, cliente web/móvil). |
| **2** | Contenedores | Descomposición interna: `gateway`, microservicios de dominio, RabbitMQ, Redis, bases PostgreSQL por servicio y componentes de observabilidad. |

Los diagramas editables (draw.io) están en el siguiente enlace:

**[C4 Tesla Supercharger — Nivel 1 y Nivel 2 (Google Drive)](https://drive.google.com/file/d/1JRqQWKgSwVESSB8TuJGN5-kLjz_RNFmJ/view?usp=sharing)**

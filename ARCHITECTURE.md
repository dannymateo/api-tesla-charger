# Arquitectura hexagonal — Tesla Supercharger

Alineada con `eco-store-microservice` (Java/Spring), adaptada a NestJS + TypeScript.

## Capas por microservicio

```
src/
├── domain/
│   ├── enum/               # Enums de dominio (un archivo por enum)
│   ├── error/              # DomainValidationError
│   └── model/              # Clases de dominio (una por archivo, con validaciones)
├── application/
│   ├── port/
│   │   ├── in/             # Casos de uso (driving ports)
│   │   └── out/            # Puertos de salida (driven ports)
│   └── service/            # *ApplicationService implementa port/in
├── infrastructure/
│   └── adapter/
│       ├── in/             # Entrada: rpc, http, messaging (consumers)
│       └── out/            # Salida: persistence, messaging, cache, payment
├── app.module.ts
└── main.ts
```

### Capa de dominio por servicio

| Servicio | Enums (`domain/enum/`) | Modelos (`domain/model/`) |
|----------|------------------------|----------------------------|
| auth-service | `user-role` | `user`, `public-user` |
| stations-service | `station-operational-state` | `station`, `station-state-view` |
| sessions-service | `session-status` | `charging-session`, `session-view` |
| billing-service | `invoice-status`, `payment-status`, `notification-type` | `invoice`, `payment`, `session-closed-event`, `email-notification` |
| notification-service | `notification-type` | `email-notification` |
| gateway | `user-role` | `authenticated-user` |

Cada clase expone `static createNew()` / `static reconstitute()` y valida invariantes (estilo eco-store Java).

## Reglas de dependencia

- `domain` no importa de `application` ni `infrastructure`.
- `application` solo importa `domain` y sus propios `port/*`.
- `infrastructure` implementa `application/port/out` y llama a `application/port/in` (vía adapters `in`).

## API Gateway (estilo eco-store)

El gateway no expone dominio de negocio completo; actúa como **adaptador HTTP/WS** hacia microservicios:

```
src/
├── domain/
│   └── model/              # Tipos transversales (ej. AuthenticatedUser)
├── infrastructure/
│   ├── messaging/          # Clientes RPC (salida)
│   └── adapter/
│       └── in/
│           ├── web/        # *gateway (controladores REST por contexto)
│           ├── ws/
│           └── messaging/  # consumers RabbitMQ
├── app.module.ts
└── main.ts
```

## Convenciones de nombres

| Eco-store (Java) | Tesla Supercharger (NestJS) |
|------------------|-------------------|
| `IGetCartUseCase` | `IGetCartUseCase` (interface en `port/in`) |
| `CartRepositoryPort` | `CartRepositoryPort` (abstract class o interface en `port/out`) |
| `CartApplicationService` | `CartApplicationService` en `application/service` |
| `CartCommandAdapter` | `cart-rpc.controller.ts` en `adapter/in/rpc` |
| `PostgresCartRepositoryAdapter` | `prisma-cart.repository.ts` en `adapter/out/persistence` |

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  HttpMetricsInterceptor,
  MetricsController,
} from '../shared/observability';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AdminMapService } from './application/service/admin-map.service';
import { SessionProgressConsumer } from './infrastructure/adapter/in/messaging/session-progress.consumer';
import { StationEventsConsumer } from './infrastructure/adapter/in/messaging/station-events.consumer';
import { AdminMapController } from './infrastructure/adapter/in/web/admingateway/admin-map.controller';
import { JwtTokenVerifier } from './infrastructure/adapter/in/web/shared/auth/jwt-token-verifier';
import { StationsGateway } from './infrastructure/adapter/in/ws/stations.gateway';
import { AuthController } from './infrastructure/adapter/in/web/authgateway/auth.controller';
import { BillingController } from './infrastructure/adapter/in/web/billinggateway/billing.controller';
import { HealthController } from './infrastructure/adapter/in/web/health.controller';
import { PaymentsController } from './infrastructure/adapter/in/web/paymentsgateway/payments.controller';
import { SessionsController } from './infrastructure/adapter/in/web/sessionsgateway/sessions.controller';
import { StationsController } from './infrastructure/adapter/in/web/stationsgateway/stations.controller';
import { AuthRpcClient } from './infrastructure/messaging/auth-rpc.client';
import { BillingRpcClient } from './infrastructure/messaging/billing-rpc.client';
import { SessionsRpcClient } from './infrastructure/messaging/sessions-rpc.client';
import { StationsRpcClient } from './infrastructure/messaging/stations-rpc.client';

@Module({
  controllers: [
    MetricsController,
    HealthController,
    AuthController,
    BillingController,
    PaymentsController,
    StationsController,
    SessionsController,
    AdminMapController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    AdminMapService,
    JwtTokenVerifier,
    AuthRpcClient,
    BillingRpcClient,
    StationsRpcClient,
    SessionsRpcClient,
    StationsGateway,
    StationEventsConsumer,
    SessionProgressConsumer,
    {
      provide: 'AUTH_RPC_CLIENT',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
            ],
            queue: 'auth.rpc.queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
    },
    {
      provide: 'STATIONS_RPC_CLIENT',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
            ],
            queue: 'stations.rpc.queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
    },
    {
      provide: 'SESSIONS_RPC_CLIENT',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
            ],
            queue: 'sessions.rpc.queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
    },
    {
      provide: 'BILLING_RPC_CLIENT',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
            ],
            queue: 'billing.rpc.queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
    },
  ],
})
export class AppModule {}

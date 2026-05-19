import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  HttpMetricsInterceptor,
  MetricsController,
} from '../shared/observability';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthRpcPort } from './application/port/out/auth-rpc.port';
import { BillingEventsPort } from './application/port/out/billing-events.port';
import { BillingRepositoryPort } from './application/port/out/billing-repository.port';
import { NotificationEventsPort } from './application/port/out/notification-events.port';
import { PaymentProviderPort } from './application/port/out/payment-provider.port';
import { BillingApplicationService } from './application/service/billing.application-service';
import { OverdueCronService } from './application/service/overdue-cron.service';
import { PaymentApplicationService } from './application/service/payment.application-service';
import { HealthController } from './infrastructure/adapter/in/http/health.controller';
import { PaypalWebhookController } from './infrastructure/adapter/in/http/paypal-webhook.controller';
import { SessionClosedConsumer } from './infrastructure/adapter/in/messaging/session-closed.consumer';
import { BillingRpcController } from './infrastructure/adapter/in/rpc/billing-rpc.controller';
import { RabbitAuthRpcAdapter } from './infrastructure/adapter/out/messaging/rabbit-auth-rpc.adapter';
import { RabbitBillingEventsAdapter } from './infrastructure/adapter/out/messaging/rabbit-billing-events.adapter';
import { RabbitNotificationEventsAdapter } from './infrastructure/adapter/out/messaging/rabbit-notification-events.adapter';
import { PaypalPaymentAdapter } from './infrastructure/adapter/out/payment/paypal-payment.adapter';
import { PrismaBillingRepository } from './infrastructure/adapter/out/persistence/prisma-billing.repository';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [
    MetricsController,
    BillingRpcController,
    HealthController,
    PaypalWebhookController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    BillingApplicationService,
    PaymentApplicationService,
    OverdueCronService,
    SessionClosedConsumer,
    { provide: BillingRepositoryPort, useClass: PrismaBillingRepository },
    { provide: BillingEventsPort, useClass: RabbitBillingEventsAdapter },
    { provide: PaymentProviderPort, useClass: PaypalPaymentAdapter },
    { provide: AuthRpcPort, useClass: RabbitAuthRpcAdapter },
    { provide: NotificationEventsPort, useClass: RabbitNotificationEventsAdapter },
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
            queueOptions: { durable: true },
          },
        }),
    },
  ],
})
export class AppModule {}

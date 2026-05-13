import { Module } from '@nestjs/common';
import { AuthApplicationService } from './application/service/auth.application-service';
import { JwtTokenPort } from './application/port/out/jwt-token.port';
import { NotificationEventsPort } from './application/port/out/notification-events.port';
import { UserRepositoryPort } from './application/port/out/user-repository.port';
import { InvoicesPaidConsumer } from './infrastructure/adapter/in/messaging/invoices-paid.consumer';
import { UserOverdueConsumer } from './infrastructure/adapter/in/messaging/user-overdue.consumer';
import { AuthRpcController } from './infrastructure/adapter/in/rpc/auth-rpc.controller';
import { JwtTokenAdapter } from './infrastructure/adapter/out/auth/jwt-token.adapter';
import { RabbitNotificationEventsAdapter } from './infrastructure/adapter/out/messaging/rabbit-notification-events.adapter';
import { PrismaUserRepository } from './infrastructure/adapter/out/persistence/prisma-user.repository';
import { PrismaService } from './infrastructure/adapter/out/persistence/prisma.service';

@Module({
  controllers: [AuthRpcController],
  providers: [
    PrismaService,
    AuthApplicationService,
    InvoicesPaidConsumer,
    UserOverdueConsumer,
    { provide: UserRepositoryPort, useClass: PrismaUserRepository },
    { provide: JwtTokenPort, useClass: JwtTokenAdapter },
    { provide: NotificationEventsPort, useClass: RabbitNotificationEventsAdapter },
  ],
})
export class AppModule {}

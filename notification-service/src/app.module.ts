import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  HttpMetricsInterceptor,
  MetricsController,
} from '../shared/observability';
import { NotificationApplicationService } from './application/service/notification.application-service';
import { EmailSenderPort } from './application/port/out/email-sender.port';
import { EmailTemplatePort } from './application/port/out/email-template.port';
import { HealthController } from './infrastructure/adapter/in/http/health.controller';
import { NotificationSendConsumer } from './infrastructure/adapter/in/messaging/notification-send.consumer';
import { EmailTemplateRenderer } from './infrastructure/adapter/out/email/email-template.renderer';
import { GmailSmtpAdapter } from './infrastructure/adapter/out/email/gmail-smtp.adapter';

@Module({
  controllers: [MetricsController, HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    NotificationApplicationService,
    NotificationSendConsumer,
    { provide: EmailSenderPort, useClass: GmailSmtpAdapter },
    { provide: EmailTemplatePort, useClass: EmailTemplateRenderer },
  ],
})
export class AppModule {}

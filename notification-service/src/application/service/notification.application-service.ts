import { Injectable } from '@nestjs/common';
import { EmailNotification } from '../../domain/model/email-notification';
import { ISendEmailNotificationUseCase } from '../port/in/send-notification.use-case';
import { EmailSenderPort } from '../port/out/email-sender.port';
import { EmailTemplatePort } from '../port/out/email-template.port';

@Injectable()
export class NotificationApplicationService implements ISendEmailNotificationUseCase {
  constructor(
    private readonly emailSender: EmailSenderPort,
    private readonly emailTemplate: EmailTemplatePort,
  ) {}

  async send(notification: EmailNotification): Promise<void> {
    const htmlBody = this.emailTemplate.render(notification);
    await this.emailSender.send(notification, htmlBody);
  }
}

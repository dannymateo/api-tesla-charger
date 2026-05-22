import { EmailNotification } from '../../../domain/model/email-notification';

export abstract class EmailSenderPort {
  abstract send(notification: EmailNotification, htmlBody: string): Promise<void>;
}

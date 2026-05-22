import { EmailNotification } from '../../../domain/model/email-notification';

export abstract class EmailTemplatePort {
  abstract render(notification: EmailNotification): string;
}

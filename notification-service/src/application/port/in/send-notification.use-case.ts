import { EmailNotification } from '../../../domain/model/email-notification';

export interface ISendEmailNotificationUseCase {
  send(notification: EmailNotification): Promise<void>;
}

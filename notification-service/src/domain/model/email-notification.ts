import { DomainValidationError } from '../error/domain-validation.error';
import { NotificationType } from '../enum/notification-type.enum';

export type EmailAttachmentData = {
  filename: string;
  contentBase64: string;
  contentType: string;
};

export type EmailDetailRow = {
  label: string;
  value: string;
};

export type CreateEmailNotificationData = {
  type: NotificationType;
  to: string;
  subject?: string;
  headline: string;
  description: string;
  details?: EmailDetailRow[];
  ctaLabel?: string;
  ctaUrl?: string;
  textBody?: string;
  attachment?: EmailAttachmentData;
};

export class EmailNotification {
  private constructor(
    readonly type: NotificationType,
    readonly to: string,
    readonly subject: string,
    readonly headline: string,
    readonly description: string,
    readonly details: EmailDetailRow[],
    readonly ctaLabel: string | undefined,
    readonly ctaUrl: string | undefined,
    readonly textBody: string | undefined,
    readonly attachment: EmailAttachmentData | undefined,
  ) {}

  static create(input: CreateEmailNotificationData): EmailNotification {
    const type = EmailNotification.validateType(input.type);
    const to = EmailNotification.validateEmail(input.to);
    const headline = EmailNotification.validateText(input.headline, 'Headline');
    const description = EmailNotification.validateText(input.description, 'Description');

    return new EmailNotification(
      type,
      to,
      input.subject?.trim() || EmailNotification.defaultSubject(type),
      headline,
      description,
      input.details ?? [],
      input.ctaLabel?.trim() || undefined,
      input.ctaUrl?.trim() || undefined,
      input.textBody?.trim() || undefined,
      input.attachment ? EmailNotification.validateAttachment(input.attachment) : undefined,
    );
  }

  static fromEventPayload(payload: unknown): EmailNotification {
    if (!payload || typeof payload !== 'object') {
      throw new DomainValidationError('Notification payload is required');
    }

    const data = payload as CreateEmailNotificationData;
    return EmailNotification.create(data);
  }

  private static defaultSubject(type: NotificationType): string {
    switch (type) {
      case NotificationType.REGISTRATION:
        return 'Bienvenido a Tesla Supercharger';
      case NotificationType.INVOICE:
        return 'Nueva factura de carga disponible';
      case NotificationType.PAYMENT:
        return 'Pago confirmado — Tesla Supercharger';
      default:
        return 'Notificación Tesla Supercharger';
    }
  }

  private static validateType(type: NotificationType): NotificationType {
    if (!Object.values(NotificationType).includes(type)) {
      throw new DomainValidationError('Invalid notification type');
    }
    return type;
  }

  private static validateEmail(email: string): string {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new DomainValidationError('Recipient email is required');
    }
    return normalized;
  }

  private static validateText(value: string, field: string): string {
    if (!value?.trim()) {
      throw new DomainValidationError(`${field} is required`);
    }
    return value.trim();
  }

  private static validateAttachment(attachment: EmailAttachmentData): EmailAttachmentData {
    if (!attachment.filename?.trim()) {
      throw new DomainValidationError('Attachment filename is required');
    }
    if (!attachment.contentBase64?.trim()) {
      throw new DomainValidationError('Attachment content is required');
    }
    if (!attachment.contentType?.trim()) {
      throw new DomainValidationError('Attachment content type is required');
    }
    return {
      filename: attachment.filename.trim(),
      contentBase64: attachment.contentBase64.trim(),
      contentType: attachment.contentType.trim(),
    };
  }
}

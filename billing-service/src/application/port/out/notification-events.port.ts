export type NotificationEmailPayload = {
  type: 'REGISTRATION' | 'INVOICE' | 'PAYMENT' | 'GENERIC';
  to: string;
  subject?: string;
  headline: string;
  description: string;
  details?: Array<{ label: string; value: string }>;
  ctaLabel?: string;
  ctaUrl?: string;
  textBody?: string;
  attachment?: {
    filename: string;
    contentBase64: string;
    contentType: string;
  };
};

export abstract class NotificationEventsPort {
  abstract publishEmailNotification(payload: NotificationEmailPayload): Promise<void>;
}

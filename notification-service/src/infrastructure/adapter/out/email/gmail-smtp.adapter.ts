import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { SendMailOptions, Transporter } from 'nodemailer';
import { EmailNotification } from '../../../../domain/model/email-notification';
import { EmailSenderPort } from '../../../../application/port/out/email-sender.port';
import { EMAIL_LOGO_CID, getEmailLogoBuffer } from './email-brand.assets';

@Injectable()
export class GmailSmtpAdapter extends EmailSenderPort {
  private readonly logger = new Logger(GmailSmtpAdapter.name);
  private transporter?: Transporter;

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      throw new Error('SMTP_USER and SMTP_PASS are required');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async send(notification: EmailNotification, htmlBody: string): Promise<void> {
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@tesla.local';
    const textBody =
      notification.textBody ??
      [notification.headline, notification.description, ...notification.details.map((d) => `${d.label}: ${d.value}`)].join('\n');

    const mailOptions: SendMailOptions = {
      from,
      to: notification.to,
      subject: notification.subject,
      text: textBody,
      html: htmlBody,
      attachments: [
        {
          filename: 'tesla-logo.png',
          content: getEmailLogoBuffer(),
          cid: EMAIL_LOGO_CID,
          contentDisposition: 'inline',
        },
      ],
    };

    if (notification.attachment) {
      mailOptions.attachments!.push({
        filename: notification.attachment.filename,
        content: Buffer.from(notification.attachment.contentBase64, 'base64'),
        contentType: notification.attachment.contentType,
      });
    }

    const transporter = this.getTransporter();
    await transporter.sendMail(mailOptions);
    this.logger.log(`email sent to ${notification.to} (${notification.type})`);
  }
}

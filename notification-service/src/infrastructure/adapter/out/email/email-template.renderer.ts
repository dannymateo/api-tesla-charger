import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../../../domain/enum/notification-type.enum';
import { EmailNotification } from '../../../../domain/model/email-notification';
import { EmailTemplatePort } from '../../../../application/port/out/email-template.port';
import { EMAIL_LOGO_CID } from './email-brand.assets';

@Injectable()
export class EmailTemplateRenderer extends EmailTemplatePort {
  render(notification: EmailNotification): string {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    const accent = '#e82127';
    const bg = '#000000';
    const cardBg = '#111111';
    const text = '#ffffff';
    const muted = '#9ca3af';
    const border = '#2a2a2a';
    const labelBg = '#1a1a1a';
    const typeLabel = this.typeLabel(notification.type);
    const preheader = this.escape(notification.description).slice(0, 140);
    const appHost = appUrl.replace(/^https?:\/\//, '');

    const detailsRows = notification.details
      .map(
        (row, index) => `
          <tr>
            <td style="padding:14px 16px;color:${muted};font-size:13px;font-weight:500;background:${labelBg};border-bottom:1px solid ${border};${index === 0 ? 'border-top-left-radius:6px;' : ''}${index === notification.details.length - 1 ? 'border-bottom-left-radius:6px;' : ''}">
              ${this.escape(row.label)}
            </td>
            <td style="padding:14px 16px;color:${text};font-size:14px;font-weight:600;text-align:right;background:${cardBg};border-bottom:1px solid ${border};${index === 0 ? 'border-top-right-radius:6px;' : ''}${index === notification.details.length - 1 ? 'border-bottom-right-radius:6px;' : ''}">
              ${this.escape(row.value)}
            </td>
          </tr>`,
      )
      .join('');

    const detailsBlock =
      notification.details.length > 0
        ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding-bottom:10px;color:${muted};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">
                Detalle
              </td>
            </tr>
            ${detailsRows}
          </table>`
        : '';

    const ctaBlock =
      notification.ctaLabel && notification.ctaUrl
        ? `
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:32px;">
            <tr>
              <td style="border-radius:999px;background:${accent};">
                <a href="${this.escapeAttr(notification.ctaUrl)}" target="_blank" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.6px;text-transform:uppercase;">
                  ${this.escape(notification.ctaLabel)}
                </a>
              </td>
            </tr>
          </table>`
        : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${this.escape(notification.subject)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-card { padding: 28px 20px !important; }
      .email-logo { width: 168px !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <a href="${this.escapeAttr(appUrl)}" target="_blank" style="text-decoration:none;">
                <img
                  class="email-logo"
                  src="cid:${EMAIL_LOGO_CID}"
                  alt="Tesla Supercharger"
                  width="200"
                  height="27"
                  style="display:block;width:200px;height:auto;border:0;outline:none;"
                />
              </a>
              <p style="margin:10px 0 0;color:${muted};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">
                Supercharger
              </p>
              <div style="width:48px;height:2px;background:${accent};margin:18px auto 0;border-radius:999px;"></div>
            </td>
          </tr>
          <tr>
            <td class="email-card" style="background:${cardBg};border:1px solid ${border};border-radius:12px;padding:36px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:6px 12px;border-radius:999px;background:rgba(232,33,39,0.12);border:1px solid rgba(232,33,39,0.35);color:${accent};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                    ${this.escape(typeLabel)}
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 14px;color:${text};font-size:30px;font-weight:600;line-height:1.25;letter-spacing:-0.3px;">
                ${this.escape(notification.headline)}
              </h1>
              <p style="margin:0;color:${muted};font-size:16px;line-height:1.7;">
                ${this.formatDescription(notification.description)}
              </p>
              ${detailsBlock}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0 0 8px;color:${muted};font-size:12px;line-height:1.6;">
                Red de carga rápida en Medellín
              </p>
              <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
                <a href="${this.escapeAttr(appUrl)}" target="_blank" style="color:#6b7280;text-decoration:underline;">${this.escape(appHost)}</a>
                &nbsp;·&nbsp; Este correo fue enviado automáticamente, por favor no respondas.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private typeLabel(type: NotificationType): string {
    switch (type) {
      case NotificationType.REGISTRATION:
        return 'Registro';
      case NotificationType.INVOICE:
        return 'Factura';
      case NotificationType.PAYMENT:
        return 'Pago';
      default:
        return 'Notificación';
    }
  }

  private formatDescription(description: string): string {
    return this.escape(description).replace(/\n/g, '<br />');
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttr(value: string): string {
    return this.escape(value);
  }
}

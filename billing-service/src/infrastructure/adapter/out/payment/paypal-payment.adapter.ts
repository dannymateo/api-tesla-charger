import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderPort } from '../../../../application/port/out/payment-provider.port';

@Injectable()
export class PaypalPaymentAdapter extends PaymentProviderPort {
  private readonly logger = new Logger(PaypalPaymentAdapter.name);

  private get config() {
    return {
      clientId: process.env.PAYPAL_CLIENT_ID ?? '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? '',
      baseUrl: (process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com').replace(/\/$/, ''),
      returnUrl: process.env.PAYPAL_RETURN_URL ?? '',
      cancelUrl: process.env.PAYPAL_CANCEL_URL ?? '',
      currency: process.env.PAYPAL_CURRENCY ?? 'USD',
    };
  }

  async createOrder(input: {
    referenceId: string;
    customId: string;
    amount: string;
    currency: string;
  }) {
    this.validateConfiguration();
    const accessToken = await this.fetchAccessToken();
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.referenceId,
          custom_id: input.customId,
          amount: {
            currency_code: input.currency,
            value: input.amount,
          },
        },
      ],
      application_context: {
        return_url: this.config.returnUrl,
        cancel_url: this.config.cancelUrl,
      },
    };

    const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as {
      id?: string;
      links?: Array<{ rel?: string; href?: string }>;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(`PayPal create order error: ${response.status} ${JSON.stringify(body)}`);
    }

    const orderId = body.id;
    const approvalUrl = body.links?.find((link) => link.rel === 'approve')?.href;
    if (!orderId || !approvalUrl) {
      throw new Error('PayPal response missing order id or approve url');
    }

    return { orderId, approvalUrl };
  }

  async captureOrder(orderId: string) {
    this.validateConfiguration();
    const accessToken = await this.fetchAccessToken();

    const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    const body = (await response.json()) as {
      status?: string;
      purchase_units?: Array<{
        payments?: { captures?: Array<{ id?: string }> };
      }>;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(`PayPal capture error: ${response.status} ${JSON.stringify(body)}`);
    }

    if (body.status?.toUpperCase() !== 'COMPLETED') {
      throw new Error(`PayPal capture not completed. status=${body.status ?? 'unknown'}`);
    }

    const captureId = body.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    return captureId ?? orderId;
  }

  getDefaultCurrency() {
    return this.config.currency;
  }

  async verifyWebhookSignature(input: {
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
  }) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID not set — skipping webhook signature verification');
      return true;
    }

    const header = (name: string) => {
      const value = input.headers[name.toLowerCase()] ?? input.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    const transmissionId = header('paypal-transmission-id');
    const transmissionTime = header('paypal-transmission-time');
    const certUrl = header('paypal-cert-url');
    const authAlgo = header('paypal-auth-algo');
    const transmissionSig = header('paypal-transmission-sig');

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      this.logger.warn('PayPal webhook missing signature headers');
      return false;
    }

    this.validateConfiguration();
    const accessToken = await this.fetchAccessToken();

    const response = await fetch(`${this.config.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: input.body,
      }),
    });

    const body = (await response.json()) as { verification_status?: string; message?: string };
    if (!response.ok) {
      this.logger.warn(
        `PayPal webhook verification failed: ${response.status} ${body.message ?? JSON.stringify(body)}`,
      );
      return false;
    }

    return body.verification_status?.toUpperCase() === 'SUCCESS';
  }

  private async fetchAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64',
    );
    const response = await fetch(`${this.config.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const body = (await response.json()) as { access_token?: string };
    if (!response.ok || !body.access_token) {
      throw new Error(`PayPal token error: ${response.status} ${JSON.stringify(body)}`);
    }
    return body.access_token;
  }

  private validateConfiguration() {
    const missing: string[] = [];
    if (!this.config.clientId) missing.push('PAYPAL_CLIENT_ID');
    if (!this.config.clientSecret) missing.push('PAYPAL_CLIENT_SECRET');
    if (!this.config.returnUrl) missing.push('PAYPAL_RETURN_URL');
    if (!this.config.cancelUrl) missing.push('PAYPAL_CANCEL_URL');
    if (missing.length > 0) {
      throw new Error(`PayPal not configured: ${missing.join(', ')}`);
    }
  }
}

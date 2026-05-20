export abstract class PaymentProviderPort {
  abstract getDefaultCurrency(): string;
  abstract createOrder(input: {
    referenceId: string;
    customId: string;
    amount: string;
    currency: string;
  }): Promise<{ orderId: string; approvalUrl: string }>;
  abstract captureOrder(orderReference: string): Promise<string>;
  abstract verifyWebhookSignature(input: {
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
  }): Promise<boolean>;
}

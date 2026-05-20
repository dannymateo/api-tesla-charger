import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingEventsPort } from '../port/out/billing-events.port';
import { BillingRepositoryPort } from '../port/out/billing-repository.port';
import { NotificationEventsPort } from '../port/out/notification-events.port';
import { PaymentProviderPort } from '../port/out/payment-provider.port';
import { AuthRpcPort } from '../port/out/auth-rpc.port';
import { BillingApplicationService } from './billing.application-service';

@Injectable()
export class PaymentApplicationService {
  constructor(
    private readonly billingRepository: BillingRepositoryPort,
    private readonly paymentProvider: PaymentProviderPort,
    private readonly billingEvents: BillingEventsPort,
    private readonly billingApplicationService: BillingApplicationService,
    private readonly authRpc: AuthRpcPort,
    private readonly notificationEvents: NotificationEventsPort,
  ) {}

  async createPayPalCheckout(userId: string, invoiceIds: string[]) {
    if (!invoiceIds.length) {
      throw new BadRequestException('invoiceIds must not be empty');
    }

    const uniqueIds = [...new Set(invoiceIds)];
    const invoices = await this.billingRepository.findInvoicesByIdsForUser(userId, uniqueIds);

    if (invoices.length !== uniqueIds.length) {
      throw new NotFoundException('One or more invoices were not found');
    }

    const notPayable = invoices.filter((invoice) => !invoice.isPayable());
    if (notPayable.length > 0) {
      throw new ConflictException({
        code: 'INVOICE_NOT_PAYABLE',
        message: 'All invoices must be PENDING or OVERDUE',
        invoiceIds: notPayable.map((invoice) => invoice.id),
      });
    }

    const pendingPayments = await this.billingRepository.findPendingPaymentsForInvoices(uniqueIds);
    if (pendingPayments.length > 0) {
      const existing = pendingPayments[0];
      throw new ConflictException({
        code: 'PAYMENT_ALREADY_PENDING',
        message: 'There is already an active PayPal checkout for one or more of these invoices',
        paymentId: existing.paymentId,
        paypalOrderId: existing.paypalOrderId,
        invoiceIds: existing.invoiceIds,
      });
    }

    const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    if (total <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    const currency = this.paymentProvider.getDefaultCurrency();
    const amountValue = total.toFixed(2);

    const { paymentId } = await this.billingRepository.createPendingPayment(amountValue, uniqueIds);

    const paypalOrder = await this.paymentProvider.createOrder({
      referenceId: paymentId,
      customId: userId,
      amount: amountValue,
      currency,
    });

    await this.billingRepository.setPaymentPaypalOrderId(paymentId, paypalOrder.orderId);

    return {
      paymentId,
      paypalOrderId: paypalOrder.orderId,
      approvalUrl: paypalOrder.approvalUrl,
      amount: Number(amountValue),
      currency,
      invoiceIds: uniqueIds,
    };
  }

  async verifyPayPalWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ) {
    return this.paymentProvider.verifyWebhookSignature({ headers, body });
  }

  async confirmPayPalOrder(
    orderReference: string,
    rawPayload?: Record<string, unknown>,
  ) {
    const payment = await this.billingRepository.findPaymentByPaypalOrderId(orderReference);

    if (!payment) {
      throw new NotFoundException(`Payment not found for PayPal order ${orderReference}`);
    }

    if (payment.isCompleted()) {
      return {
        processed: true,
        idempotent: true,
        paymentId: payment.id,
        status: payment.status,
      };
    }

    const captureId = await this.paymentProvider.captureOrder(orderReference);
    const invoiceIds = payment.invoiceLinks.map((link) => link.invoiceId);
    const userId = payment.invoiceLinks[0]?.invoice.userId;

    if (!userId) {
      throw new NotFoundException('Payment has no linked invoices');
    }

    await this.billingRepository.completePayment(
      payment.id,
      captureId,
      invoiceIds,
      rawPayload ? JSON.stringify(rawPayload) : undefined,
    );

    const overdueCheck = await this.billingApplicationService.userHasOverdueInvoices(userId);
    await this.billingEvents.publishInvoicesPaid({
      userId,
      paymentId: payment.id,
      invoiceIds,
      hasRemainingOverdue: overdueCheck.hasOverdue,
    });

    void this.notifyPaymentConfirmed(userId, payment.id, invoiceIds, payment.amount);

    return {
      processed: true,
      idempotent: false,
      paymentId: payment.id,
      status: 'COMPLETED',
      captureId,
      invoiceIds,
    };
  }

  private async notifyPaymentConfirmed(
    userId: string,
    paymentId: string,
    invoiceIds: string[],
    amount: number,
  ) {
    try {
      const profile = await this.authRpc.getProfile(userId);
      void this.notificationEvents.publishEmailNotification({
        type: 'PAYMENT',
        to: profile.email,
        headline: 'Pago confirmado',
        description: 'Hemos recibido tu pago correctamente. Gracias por usar la red Tesla Supercharger.',
        details: [
          { label: 'Pago', value: paymentId },
          { label: 'Monto', value: `$${amount.toFixed(2)} USD` },
          { label: 'Facturas', value: invoiceIds.join(', ') },
        ],
        ctaLabel: 'Ver historial de facturas',
        ctaUrl: `${process.env.APP_URL ?? 'http://localhost:3001'}/driver/billing`,
      });
    } catch {
      // notification must not block payment flow
    }
  }
}

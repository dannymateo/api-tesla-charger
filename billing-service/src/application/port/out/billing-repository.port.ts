import { Invoice } from '../../../domain/model/invoice';
import { PaymentWithInvoices } from '../../../domain/model/payment';

export abstract class BillingRepositoryPort {
  abstract findProcessedEvent(eventId: string): Promise<{ eventId: string } | null>;
  abstract markProcessedEvent(eventId: string, consumer: string): Promise<void>;
  abstract findInvoiceBySessionId(sessionId: string): Promise<Invoice | null>;
  abstract createInvoice(data: ReturnType<typeof Invoice.createNew>): Promise<Invoice>;
  abstract listInvoices(input: {
    userId: string;
    status?: string;
    month?: string;
  }): Promise<Invoice[]>;
  abstract findInvoiceForUser(userId: string, invoiceId: string): Promise<Invoice | null>;
  abstract aggregatePaidRevenueToday(start: Date, end: Date): Promise<{
    total: number;
    count: number;
  }>;
  abstract aggregatePaidRevenueTodayByStation(
    start: Date,
    end: Date,
  ): Promise<Array<{ stationId: string; total: number; count: number }>>;
  abstract findPendingInvoicesOlderThan(cutoff: Date): Promise<Invoice[]>;
  abstract markInvoicesOverdue(ids: string[]): Promise<void>;
  abstract countOverdueInvoices(userId: string): Promise<number>;
  abstract findInvoicesByIdsForUser(userId: string, invoiceIds: string[]): Promise<Invoice[]>;
  abstract findPendingPaymentsForInvoices(invoiceIds: string[]): Promise<
    Array<{
      paymentId: string;
      paypalOrderId: string | null;
      invoiceIds: string[];
    }>
  >;
  abstract createPendingPayment(
    amount: string,
    invoiceIds: string[],
  ): Promise<{ paymentId: string }>;
  abstract setPaymentPaypalOrderId(paymentId: string, orderId: string): Promise<void>;
  abstract findPaymentByPaypalOrderId(orderReference: string): Promise<PaymentWithInvoices | null>;
  abstract completePayment(
    paymentId: string,
    captureId: string,
    invoiceIds: string[],
    rawPayload?: string,
  ): Promise<void>;
}

import { Invoice as PrismaInvoice, Payment as PrismaPayment, Prisma } from '@prisma/client';
import { parseInvoiceStatus } from '../../../../domain/enum/invoice-status.enum';
import { parsePaymentStatus } from '../../../../domain/enum/payment-status.enum';
import { Invoice } from '../../../../domain/model/invoice';
import { Payment, PaymentWithInvoices } from '../../../../domain/model/payment';

export function toDomainInvoice(record: PrismaInvoice): Invoice {
  return Invoice.reconstitute({
    id: record.id,
    userId: record.userId,
    sessionId: record.sessionId,
    kwh: Number(record.kwh),
    unitPrice: Number(record.unitPrice),
    total: Number(record.total),
    status: parseInvoiceStatus(record.status),
    issuedAt: record.issuedAt,
    paidAt: record.paidAt,
  });
}

export function toDomainPayment(record: PrismaPayment): Payment {
  return Payment.reconstitute({
    id: record.id,
    paypalOrderId: record.paypalOrderId,
    paypalCaptureId: record.paypalCaptureId,
    amount: Number(record.amount),
    status: parsePaymentStatus(record.status),
    createdAt: record.createdAt,
  });
}

export function toDomainPaymentWithInvoices(
  record: PrismaPayment & {
    invoiceLinks: Array<{ invoiceId: string; invoice: PrismaInvoice }>;
  },
): PaymentWithInvoices {
  return PaymentWithInvoices.reconstitute(
    toDomainPayment(record),
    record.invoiceLinks.map((link) => ({
      invoiceId: link.invoiceId,
      invoice: toDomainInvoice(link.invoice),
    })),
  );
}

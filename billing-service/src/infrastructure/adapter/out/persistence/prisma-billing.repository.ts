import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { Invoice } from '../../../../domain/model/invoice';
import { BillingRepositoryPort } from '../../../../application/port/out/billing-repository.port';
import {
  toDomainInvoice,
  toDomainPaymentWithInvoices,
} from './prisma-billing.mapper';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

@Injectable()
export class PrismaBillingRepository extends PrismaService implements BillingRepositoryPort {
  findProcessedEvent(eventId: string) {
    return this.processedEvent.findUnique({ where: { eventId } });
  }

  markProcessedEvent(eventId: string, consumer: string) {
    return this.processedEvent.create({ data: { eventId, consumer } }).then(() => undefined);
  }

  async findInvoiceBySessionId(sessionId: string) {
    const invoice = await this.invoice.findUnique({ where: { sessionId } });
    return invoice ? toDomainInvoice(invoice) : null;
  }

  async createInvoice(data: ReturnType<typeof Invoice.createNew>) {
    const invoice = await this.invoice.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        stationId: data.stationId,
        kwh: new Prisma.Decimal(data.kwh),
        unitPrice: new Prisma.Decimal(data.unitPrice),
        total: new Prisma.Decimal(data.total),
        status: data.status,
      },
    });
    return toDomainInvoice(invoice);
  }

  async listInvoices(input: { userId: string; status?: string; month?: string }) {
    const where: Prisma.InvoiceWhereInput = { userId: input.userId };

    if (input.status) {
      where.status = input.status;
    }

    if (input.month) {
      const [year, month] = input.month.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      where.issuedAt = { gte: start, lt: end };
    }

    const invoices = await this.invoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
    });
    return invoices.map(toDomainInvoice);
  }

  async findInvoiceForUser(userId: string, invoiceId: string) {
    const invoice = await this.invoice.findFirst({
      where: { id: invoiceId, userId },
    });
    return invoice ? toDomainInvoice(invoice) : null;
  }

  async aggregatePaidRevenueToday(start: Date, end: Date) {
    const result = await this.invoice.aggregate({
      where: {
        status: 'PAID',
        paidAt: { gte: start, lt: end },
      },
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      total: Number(result._sum.total ?? 0),
      count: result._count.id,
    };
  }

  async aggregatePaidRevenueTodayByStation(start: Date, end: Date) {
    const rows = await this.invoice.groupBy({
      by: ['stationId'],
      where: {
        status: 'PAID',
        paidAt: { gte: start, lt: end },
        stationId: { not: null },
      },
      _sum: { total: true },
      _count: { id: true },
    });

    return rows
      .filter((row) => row.stationId)
      .map((row) => ({
        stationId: row.stationId as string,
        total: Number(row._sum.total ?? 0),
        count: row._count.id,
      }));
  }

  async findPendingInvoicesOlderThan(cutoff: Date) {
    const invoices = await this.invoice.findMany({
      where: {
        status: 'PENDING',
        issuedAt: { lt: cutoff },
      },
    });
    return invoices.map(toDomainInvoice);
  }

  markInvoicesOverdue(ids: string[]) {
    return this.invoice
      .updateMany({
        where: { id: { in: ids } },
        data: { status: 'OVERDUE' },
      })
      .then(() => undefined);
  }

  countOverdueInvoices(userId: string) {
    return this.invoice.count({
      where: { userId, status: 'OVERDUE' },
    });
  }

  async findInvoicesByIdsForUser(userId: string, invoiceIds: string[]) {
    const invoices = await this.invoice.findMany({
      where: { id: { in: invoiceIds }, userId },
    });
    return invoices.map(toDomainInvoice);
  }

  async findPendingPaymentsForInvoices(invoiceIds: string[]) {
    const links = await this.paymentInvoice.findMany({
      where: {
        invoiceId: { in: invoiceIds },
        payment: { status: 'PENDING' },
      },
      include: { payment: true },
    });

    const byPayment = new Map<
      string,
      { paymentId: string; paypalOrderId: string | null; invoiceIds: Set<string> }
    >();

    for (const link of links) {
      const current = byPayment.get(link.paymentId) ?? {
        paymentId: link.paymentId,
        paypalOrderId: link.payment.paypalOrderId,
        invoiceIds: new Set<string>(),
      };
      current.invoiceIds.add(link.invoiceId);
      byPayment.set(link.paymentId, current);
    }

    return [...byPayment.values()].map((entry) => ({
      paymentId: entry.paymentId,
      paypalOrderId: entry.paypalOrderId,
      invoiceIds: [...entry.invoiceIds],
    }));
  }

  async createPendingPayment(amount: string, invoiceIds: string[]) {
    const payment = await this.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          amount: new Prisma.Decimal(amount),
          status: 'PENDING',
        },
      });
      await tx.paymentInvoice.createMany({
        data: invoiceIds.map((invoiceId) => ({
          paymentId: created.id,
          invoiceId,
        })),
      });
      return created;
    });
    return { paymentId: payment.id };
  }

  setPaymentPaypalOrderId(paymentId: string, orderId: string) {
    return this.payment
      .update({
        where: { id: paymentId },
        data: { paypalOrderId: orderId },
      })
      .then(() => undefined);
  }

  async findPaymentByPaypalOrderId(orderReference: string) {
    const payment = await this.payment.findFirst({
      where: { paypalOrderId: orderReference },
      include: {
        invoiceLinks: { include: { invoice: true } },
      },
    });
    return payment ? toDomainPaymentWithInvoices(payment) : null;
  }

  completePayment(
    paymentId: string,
    captureId: string,
    invoiceIds: string[],
    rawPayload?: string,
  ) {
    return this.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          paypalCaptureId: captureId,
          ...(rawPayload !== undefined ? { rawPayload } : {}),
        },
      });
      await tx.invoice.updateMany({
        where: { id: { in: invoiceIds } },
        data: { status: 'PAID', paidAt: new Date() },
      });
    });
  }
}

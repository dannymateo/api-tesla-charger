import { Injectable, NotFoundException } from '@nestjs/common';
import { Invoice } from '../../domain/model/invoice';
import { SessionClosedEvent } from '../../domain/model/session-closed-event';
import { AuthRpcPort } from '../port/out/auth-rpc.port';
import { BillingRepositoryPort } from '../port/out/billing-repository.port';
import { NotificationEventsPort } from '../port/out/notification-events.port';

@Injectable()
export class BillingApplicationService {
  private static readonly CONSUMER = 'billing.session-closed';

  constructor(
    private readonly billingRepository: BillingRepositoryPort,
    private readonly authRpc: AuthRpcPort,
    private readonly notificationEvents: NotificationEventsPort,
  ) {}

  async handleSessionClosed(payload: SessionClosedEvent) {
    const eventId = `session.closed:${payload.sessionId}`;
    const alreadyProcessed = await this.billingRepository.findProcessedEvent(eventId);
    if (alreadyProcessed) {
      return { skipped: true, reason: 'already_processed' };
    }

    const existingInvoice = await this.billingRepository.findInvoiceBySessionId(payload.sessionId);
    if (existingInvoice) {
      await this.billingRepository.markProcessedEvent(eventId, BillingApplicationService.CONSUMER);
      return { skipped: true, reason: 'invoice_exists', invoiceId: existingInvoice.id };
    }

    if (!payload.isBillable()) {
      await this.billingRepository.markProcessedEvent(eventId, BillingApplicationService.CONSUMER);
      return { skipped: true, reason: 'non_billable_status' };
    }

    const invoice = await this.billingRepository.createInvoice(
      Invoice.createNew({
        userId: payload.userId,
        sessionId: payload.sessionId,
        stationId: payload.stationId,
        kwh: payload.kwh,
        unitPrice: payload.unitPrice,
        total: payload.total,
      }),
    );

    await this.billingRepository.markProcessedEvent(eventId, BillingApplicationService.CONSUMER);

    void this.notifyInvoiceCreated(payload.userId, invoice);

    return { invoice: this.toInvoiceView(invoice) };
  }

  private async notifyInvoiceCreated(userId: string, invoice: Invoice) {
    try {
      const profile = await this.authRpc.getProfile(userId);
      void this.notificationEvents.publishEmailNotification({
        type: 'INVOICE',
        to: profile.email,
        headline: 'Nueva factura de carga',
        description:
          'Tu sesión de carga ha finalizado. Revisa el detalle de tu factura y realiza el pago desde la app.',
        details: [
          { label: 'Factura', value: invoice.id },
          { label: 'Energía', value: `${invoice.kwh} kWh` },
          { label: 'Precio unitario', value: `$${invoice.unitPrice.toFixed(2)} USD/kWh` },
          { label: 'Total', value: `$${invoice.total.toFixed(2)} USD` },
          { label: 'Estado', value: invoice.status },
        ],
        ctaLabel: 'Ver facturas',
        ctaUrl: `${process.env.APP_URL ?? 'http://localhost:3001'}/driver/billing`,
      });
    } catch {
      // notification must not block billing flow
    }
  }

  async listInvoices(input: { userId: string; status?: string; month?: string }) {
    const invoices = await this.billingRepository.listInvoices(input);
    return invoices.map((invoice) => this.toInvoiceView(invoice));
  }

  async getInvoice(input: { userId: string; invoiceId: string }) {
    const invoice = await this.billingRepository.findInvoiceForUser(input.userId, input.invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return this.toInvoiceView(invoice);
  }

  async revenueToday() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const result = await this.billingRepository.aggregatePaidRevenueToday(start, end);

    return {
      date: start.toISOString().slice(0, 10),
      totalRevenue: result.total,
      paidInvoicesCount: result.count,
    };
  }

  async revenueTodayByStation() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const rows = await this.billingRepository.aggregatePaidRevenueTodayByStation(start, end);

    return {
      date: start.toISOString().slice(0, 10),
      stations: rows.map((row) => ({
        stationId: row.stationId,
        total: row.total,
        paidInvoicesCount: row.count,
      })),
    };
  }

  async markOverdueInvoices() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const overdueCandidates = await this.billingRepository.findPendingInvoicesOlderThan(cutoff);

    if (overdueCandidates.length === 0) {
      return { updated: 0, userIds: [] as string[] };
    }

    await this.billingRepository.markInvoicesOverdue(
      overdueCandidates.map((invoice) => invoice.id),
    );

    const userIds = [...new Set(overdueCandidates.map((invoice) => invoice.userId))];
    return { updated: overdueCandidates.length, userIds };
  }

  async userHasOverdueInvoices(userId: string) {
    const count = await this.billingRepository.countOverdueInvoices(userId);
    return { hasOverdue: count > 0, overdueCount: count };
  }

  private toInvoiceView(invoice: Invoice) {
    return {
      id: invoice.id,
      userId: invoice.userId,
      sessionId: invoice.sessionId,
      kwh: invoice.kwh,
      unitPrice: invoice.unitPrice,
      total: invoice.total,
      status: invoice.status,
      issuedAt: invoice.issuedAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillingEventsPort } from '../port/out/billing-events.port';
import { BillingApplicationService } from './billing.application-service';

@Injectable()
export class OverdueCronService {
  private readonly logger = new Logger(OverdueCronService.name);

  constructor(
    private readonly billingApplicationService: BillingApplicationService,
    private readonly billingEvents: BillingEventsPort,
  ) {}

  @Cron('0 0 * * *')
  async markOverdueAndNotify() {
    const { updated, userIds } = await this.billingApplicationService.markOverdueInvoices();
    if (updated === 0) {
      return;
    }

    for (const userId of userIds) {
      await this.billingEvents.publishUserDebtOverdue({ userId });
    }
    this.logger.log(`marked ${updated} invoices overdue for ${userIds.length} users`);
  }
}

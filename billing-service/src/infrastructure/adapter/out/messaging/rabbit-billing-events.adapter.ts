import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Channel, ChannelModel, connect } from 'amqplib';
import { BillingEventsPort } from '../../../../application/port/out/billing-events.port';

@Injectable()
export class RabbitBillingEventsAdapter extends BillingEventsPort implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitBillingEventsAdapter.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  private async getChannel() {
    if (this.channel) {
      return this.channel;
    }
    const user = process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet';
    const pass = process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet';
    const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
    const connection = await connect(`amqp://${user}:${pass}@${host}:5672`);
    this.connection = connection;
    this.channel = await connection.createChannel();
    await this.channel.assertExchange('voltnet.events', 'topic', { durable: true });
    return this.channel;
  }

  async publishUserDebtOverdue(payload: { userId: string }) {
    const channel = await this.getChannel();
    channel.publish(
      'voltnet.events',
      'user.debt.overdue',
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  async publishInvoicesPaid(payload: {
    userId: string;
    paymentId: string;
    invoiceIds: string[];
    hasRemainingOverdue: boolean;
  }) {
    const channel = await this.getChannel();
    channel.publish(
      'voltnet.events',
      'invoices.paid',
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      this.logger.warn(`error closing rabbit channel: ${(error as Error).message}`);
    }
  }
}

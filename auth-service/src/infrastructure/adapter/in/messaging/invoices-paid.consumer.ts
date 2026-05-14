import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { AuthApplicationService } from '../../../../application/service/auth.application-service';

@Injectable()
export class InvoicesPaidConsumer implements OnModuleInit {
  private readonly logger = new Logger(InvoicesPaidConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly authApplicationService: AuthApplicationService) {}

  async onModuleInit() {
    try {
      const user = process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet';
      const pass = process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet';
      const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
      const connection = await connect(`amqp://${user}:${pass}@${host}:5672`);
      this.connection = connection;
      this.channel = await connection.createChannel();
      await this.channel.assertQueue('auth.invoices-paid.queue', {
        durable: true,
        arguments: { 'x-dead-letter-exchange': 'voltnet.dlx' },
      });

      await this.channel.consume(
        'auth.invoices-paid.queue',
        (msg) => this.onMessage(msg),
        { noAck: false },
      );
      this.logger.log('listening on auth.invoices-paid.queue');
    } catch (error) {
      this.logger.error(`failed to connect invoices-paid consumer: ${(error as Error).message}`);
    }
  }

  private async onMessage(msg: ConsumeMessage | null) {
    if (!msg || !this.channel) {
      return;
    }
    try {
      const payload = JSON.parse(msg.content.toString()) as {
        userId: string;
        hasRemainingOverdue: boolean;
      };
      await this.authApplicationService.handleInvoicesPaid(payload);
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error(`invoices.paid processing failed: ${(error as Error).message}`);
      this.channel.nack(msg, false, true);
    }
  }
}

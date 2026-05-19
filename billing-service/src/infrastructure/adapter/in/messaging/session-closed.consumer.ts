import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { SessionClosedEvent } from '../../../../domain/model/session-closed-event';
import { BillingApplicationService } from '../../../../application/service/billing.application-service';

@Injectable()
export class SessionClosedConsumer implements OnModuleInit {
  private readonly logger = new Logger(SessionClosedConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly billingApplicationService: BillingApplicationService) {}

  async onModuleInit() {
    try {
      const user = process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet';
      const pass = process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet';
      const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
      const connection = await connect(`amqp://${user}:${pass}@${host}:5672`);
      this.connection = connection;
      this.channel = await connection.createChannel();
      await this.channel.assertQueue('billing.session-closed.queue', {
        durable: true,
        arguments: { 'x-dead-letter-exchange': 'voltnet.dlx' },
      });

      await this.channel.consume(
        'billing.session-closed.queue',
        (msg) => this.onMessage(msg),
        { noAck: false },
      );
      this.logger.log('listening on billing.session-closed.queue');
    } catch (error) {
      this.logger.error(`failed to connect session-closed consumer: ${(error as Error).message}`);
    }
  }

  private async onMessage(msg: ConsumeMessage | null) {
    if (!msg || !this.channel) {
      return;
    }
    try {
      const payload = JSON.parse(msg.content.toString()) as {
        sessionId: string;
        userId: string;
        stationId: string;
        kwh: number;
        unitPrice: number;
        total: number;
        status: string;
        closedAt?: string;
      };
      await this.billingApplicationService.handleSessionClosed(SessionClosedEvent.create(payload));
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error(`session.closed processing failed: ${(error as Error).message}`);
      this.channel.nack(msg, false, true);
    }
  }
}

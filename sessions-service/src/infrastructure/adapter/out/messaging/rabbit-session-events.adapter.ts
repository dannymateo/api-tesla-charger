import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Channel, ChannelModel, connect } from 'amqplib';
import { SessionEventsPort } from '../../../../application/port/out/session-events.port';

@Injectable()
export class RabbitSessionEventsAdapter extends SessionEventsPort implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitSessionEventsAdapter.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  private async getChannel() {
    if (this.channel) {
      return this.channel;
    }
    const user = process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet';
    const pass = process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet';
    const connection = await connect(`amqp://${user}:${pass}@rabbitmq:5672`);
    this.connection = connection;
    this.channel = await connection.createChannel();
    await this.channel.assertExchange('voltnet.events', 'topic', { durable: true });
    return this.channel;
  }

  async publishSessionClosed(payload: unknown) {
    const channel = await this.getChannel();
    channel.publish(
      'voltnet.events',
      'session.closed',
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  async publishSessionProgress(payload: unknown) {
    const channel = await this.getChannel();
    channel.publish(
      'voltnet.events',
      'session.progress.updated',
      Buffer.from(JSON.stringify(payload)),
      { persistent: false },
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

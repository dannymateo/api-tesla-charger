import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { StationsGateway } from '../ws/stations.gateway';

@Injectable()
export class SessionProgressConsumer implements OnModuleInit {
  private readonly logger = new Logger(SessionProgressConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly stationsGateway: StationsGateway) {}

  async onModuleInit() {
    try {
      const user = process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet';
      const pass = process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet';
      const connection = await connect(`amqp://${user}:${pass}@rabbitmq:5672`);
      this.connection = connection;
      this.channel = await connection.createChannel();
      await this.channel.assertQueue('gateway.session-progress.queue', {
        durable: false,
        arguments: { 'x-message-ttl': 5000 },
      });

      await this.channel.consume(
        'gateway.session-progress.queue',
        (msg) => this.onMessage(msg),
        { noAck: true },
      );
    } catch (error) {
      this.logger.error(`failed to connect session progress consumer: ${(error as Error).message}`);
    }
  }

  private onMessage(msg: ConsumeMessage | null) {
    if (!msg) {
      return;
    }
    try {
      const payload = JSON.parse(msg.content.toString()) as {
        sessionId?: string;
      } & Record<string, unknown>;
      this.stationsGateway.emitSessionProgress(payload);
    } catch (error) {
      this.logger.error(`invalid session progress payload: ${(error as Error).message}`);
    }
  }
}

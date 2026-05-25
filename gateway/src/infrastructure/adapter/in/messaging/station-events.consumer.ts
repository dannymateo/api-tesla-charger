import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { AdminMapService } from '../../../../application/service/admin-map.service';
import { StationsGateway } from '../ws/stations.gateway';

@Injectable()
export class StationEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(StationEventsConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    private readonly stationsGateway: StationsGateway,
    private readonly adminMapService: AdminMapService,
  ) {}

  async onModuleInit() {
    try {
      const user = process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet';
      const pass = process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet';
      const connection = await connect(`amqp://${user}:${pass}@rabbitmq:5672`);
      this.connection = connection;
      this.channel = await connection.createChannel();
      await this.channel.assertQueue('gateway.station-events.queue', { durable: true });

      await this.channel.consume(
        'gateway.station-events.queue',
        (msg) => {
          void this.onMessage(msg);
        },
        { noAck: false },
      );
    } catch (error) {
      this.logger.error(`failed to connect station event consumer: ${(error as Error).message}`);
    }
  }

  private async onMessage(msg: ConsumeMessage | null) {
    if (!msg || !this.channel) {
      return;
    }
    try {
      const payload = JSON.parse(msg.content.toString()) as {
        stationId?: string;
      } & Record<string, unknown>;
      const adminPayload = await this.adminMapService.enrichStationEventForAdmin(payload);
      this.stationsGateway.emitStationStateChanged(payload, adminPayload);
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error(`invalid station event payload: ${(error as Error).message}`);
      this.channel.nack(msg, false, false);
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { EmailNotification } from '../../../../domain/model/email-notification';
import { NotificationApplicationService } from '../../../../application/service/notification.application-service';

@Injectable()
export class NotificationSendConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationSendConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly notificationApplicationService: NotificationApplicationService) {}

  async onModuleInit() {
    try {
      const user = process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet';
      const pass = process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet';
      const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
      const connection = await connect(`amqp://${user}:${pass}@${host}:5672`);
      this.connection = connection;
      this.channel = await connection.createChannel();
      await this.channel.assertQueue('notification.email.queue', {
        durable: true,
        arguments: { 'x-dead-letter-exchange': 'voltnet.dlx' },
      });

      await this.channel.consume(
        'notification.email.queue',
        (msg) => this.onMessage(msg),
        { noAck: false },
      );
      this.logger.log('listening on notification.email.queue');
    } catch (error) {
      this.logger.error(`failed to connect notification consumer: ${(error as Error).message}`);
    }
  }

  private async onMessage(msg: ConsumeMessage | null) {
    if (!msg || !this.channel) {
      return;
    }
    try {
      const payload = JSON.parse(msg.content.toString());
      const notification = EmailNotification.fromEventPayload(payload);
      await this.notificationApplicationService.send(notification);
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error(`notification.send processing failed: ${(error as Error).message}`);
      this.channel.nack(msg, false, true);
    }
  }
}

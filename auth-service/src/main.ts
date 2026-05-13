import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { startSidecarServer } from '../shared/observability';
import { AppModule } from './app.module';
import { RpcHttpExceptionFilter } from './infrastructure/filters/rpc-http-exception.filter';

async function bootstrap() {
  startSidecarServer('auth-service');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
      ],
      queue: 'auth.rpc.queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}

void bootstrap();

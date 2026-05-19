import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { RpcHttpExceptionFilter } from './infrastructure/filters/rpc-http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const rpcFilter = new RpcHttpExceptionFilter();

  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
      ],
      queue: 'billing.rpc.queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  microservice.useGlobalFilters(rpcFilter);
  app.useGlobalFilters(rpcFilter);
  await app.startAllMicroservices();

  const port = Number(process.env.HEALTH_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();

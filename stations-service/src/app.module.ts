import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { StationEventsPort } from './application/port/out/station-events.port';
import { StationRepositoryPort } from './application/port/out/station-repository.port';
import { StationStateCachePort } from './application/port/out/station-state-cache.port';
import { SessionsRpcPort } from './application/port/out/sessions-rpc.port';
import { StationsApplicationService } from './application/service/stations.application-service';
import { StationsRpcController } from './infrastructure/adapter/in/rpc/stations-rpc.controller';
import { RedisStationStateAdapter } from './infrastructure/adapter/out/cache/redis-station-state.adapter';
import { RabbitSessionsRpcAdapter } from './infrastructure/adapter/out/messaging/rabbit-sessions-rpc.adapter';
import { RabbitStationEventsAdapter } from './infrastructure/adapter/out/messaging/rabbit-station-events.adapter';
import { PrismaStationRepository } from './infrastructure/adapter/out/persistence/prisma-station.repository';

@Module({
  controllers: [StationsRpcController],
  providers: [
    StationsApplicationService,
    { provide: StationRepositoryPort, useClass: PrismaStationRepository },
    { provide: StationStateCachePort, useClass: RedisStationStateAdapter },
    { provide: StationEventsPort, useClass: RabbitStationEventsAdapter },
    { provide: SessionsRpcPort, useClass: RabbitSessionsRpcAdapter },
    {
      provide: 'SESSIONS_RPC_CLIENT',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
            ],
            queue: 'sessions.rpc.queue',
            queueOptions: { durable: true },
          },
        }),
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AuthRpcPort } from './application/port/out/auth-rpc.port';
import { SessionEventsPort } from './application/port/out/session-events.port';
import { SessionRepositoryPort } from './application/port/out/session-repository.port';
import { StationCachePort } from './application/port/out/station-cache.port';
import { StationsRpcPort } from './application/port/out/stations-rpc.port';
import { SessionsApplicationService } from './application/service/sessions.application-service';
import { SessionsRpcController } from './infrastructure/adapter/in/rpc/sessions-rpc.controller';
import { RedisStationCacheAdapter } from './infrastructure/adapter/out/cache/redis-station-cache.adapter';
import { RabbitAuthRpcAdapter } from './infrastructure/adapter/out/messaging/rabbit-auth-rpc.adapter';
import { RabbitSessionEventsAdapter } from './infrastructure/adapter/out/messaging/rabbit-session-events.adapter';
import { RabbitStationsRpcAdapter } from './infrastructure/adapter/out/messaging/rabbit-stations-rpc.adapter';
import { PrismaSessionRepository } from './infrastructure/adapter/out/persistence/prisma-session.repository';

@Module({
  controllers: [SessionsRpcController],
  providers: [
    SessionsApplicationService,
    { provide: SessionRepositoryPort, useClass: PrismaSessionRepository },
    { provide: StationCachePort, useClass: RedisStationCacheAdapter },
    { provide: AuthRpcPort, useClass: RabbitAuthRpcAdapter },
    { provide: StationsRpcPort, useClass: RabbitStationsRpcAdapter },
    { provide: SessionEventsPort, useClass: RabbitSessionEventsAdapter },
    {
      provide: 'AUTH_RPC_CLIENT',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
            ],
            queue: 'auth.rpc.queue',
            queueOptions: { durable: true },
          },
        }),
    },
    {
      provide: 'STATIONS_RPC_CLIENT',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${process.env.RABBITMQ_DEFAULT_USER ?? 'voltnet'}:${process.env.RABBITMQ_DEFAULT_PASS ?? 'voltnet'}@rabbitmq:5672`,
            ],
            queue: 'stations.rpc.queue',
            queueOptions: { durable: true },
          },
        }),
    },
  ],
})
export class AppModule {}

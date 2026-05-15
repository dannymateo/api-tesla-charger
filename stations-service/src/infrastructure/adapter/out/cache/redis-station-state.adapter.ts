import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { StationStateCachePort } from '../../../../application/port/out/station-state-cache.port';

@Injectable()
export class RedisStationStateAdapter extends StationStateCachePort implements OnModuleDestroy {
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? 'redis',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  async getStationState(stationId: string) {
    const [activeKwRaw, busyConnectorsRaw] = await Promise.all([
      this.redis.get(`station:${stationId}:active_kw`),
      this.redis.get(`station:${stationId}:busy_connectors`),
    ]);

    return {
      activeKw: Number(activeKwRaw ?? 0),
      busyConnectors: Number(busyConnectorsRaw ?? 0),
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}

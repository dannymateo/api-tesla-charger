import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { StationCachePort } from '../../../../application/port/out/station-cache.port';

@Injectable()
export class RedisStationCacheAdapter extends StationCachePort implements OnModuleDestroy {
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? 'redis',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  private async getSnapshot(stationId: string) {
    const [activeKwRaw, busyConnectorsRaw] = await Promise.all([
      this.redis.get(`station:${stationId}:active_kw`),
      this.redis.get(`station:${stationId}:busy_connectors`),
    ]);
    return {
      activeKw: Number(activeKwRaw ?? 0),
      busyConnectors: Number(busyConnectorsRaw ?? 0),
    };
  }

  async reserveCapacity(stationId: string, requestedKwh: number, connectorsTotal: number) {
    const snapshot = await this.getSnapshot(stationId);
    if (snapshot.busyConnectors >= connectorsTotal) {
      return { ok: false as const, reason: 'NO_CONNECTORS' };
    }
    await this.redis.incr(`station:${stationId}:busy_connectors`);
    await this.redis.incrbyfloat(`station:${stationId}:active_kw`, requestedKwh);
    return { ok: true as const };
  }

  async setStationLoad(stationId: string, activeKw: number, busyConnectors: number) {
    await this.redis.set(`station:${stationId}:active_kw`, String(activeKw));
    await this.redis.set(`station:${stationId}:busy_connectors`, String(busyConnectors));
  }

  async releaseCapacity(stationId: string, reservedKwh: number) {
    const busy = Number((await this.redis.get(`station:${stationId}:busy_connectors`)) ?? 0);
    if (busy > 0) {
      await this.redis.decr(`station:${stationId}:busy_connectors`);
    }
    const active = Number((await this.redis.get(`station:${stationId}:active_kw`)) ?? 0);
    const nextActive = Math.max(active - reservedKwh, 0);
    await this.redis.set(`station:${stationId}:active_kw`, String(nextActive));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}

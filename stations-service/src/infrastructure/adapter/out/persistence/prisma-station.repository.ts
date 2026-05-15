import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { StationRepositoryPort } from '../../../../application/port/out/station-repository.port';
import { toDomainStation } from './prisma-station.mapper';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

@Injectable()
export class PrismaStationRepository extends PrismaService implements StationRepositoryPort {
  async create(data: Parameters<StationRepositoryPort['create']>[0]) {
    const station = await this.station.create({
      data: {
        name: data.name,
        address: data.address,
        lat: new Prisma.Decimal(data.lat),
        lng: new Prisma.Decimal(data.lng),
        connectorsTotal: data.connectorsTotal,
        maxKwThreshold: data.maxKwThreshold,
        pricePerKwh: new Prisma.Decimal(data.pricePerKwh),
        enabled: data.enabled,
      },
    });
    return toDomainStation(station);
  }

  async update(id: string, data: Parameters<StationRepositoryPort['update']>[1]) {
    const station = await this.station.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        lat: data.lat !== undefined ? new Prisma.Decimal(data.lat) : undefined,
        lng: data.lng !== undefined ? new Prisma.Decimal(data.lng) : undefined,
        connectorsTotal: data.connectorsTotal,
        maxKwThreshold: data.maxKwThreshold,
        pricePerKwh:
          data.pricePerKwh !== undefined ? new Prisma.Decimal(data.pricePerKwh) : undefined,
        enabled: data.enabled,
      },
    });
    return toDomainStation(station);
  }

  delete(id: string) {
    return this.station.delete({ where: { id } }).then(() => undefined);
  }

  async findById(id: string) {
    const station = await this.station.findUnique({ where: { id } });
    return station ? toDomainStation(station) : null;
  }

  async listPublic() {
    const stations = await this.station.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'desc' },
    });
    return stations.map(toDomainStation);
  }

  async listAdmin() {
    const stations = await this.station.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return stations.map(toDomainStation);
  }
}

const { Prisma, PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const path = require('path');
const fs = require('fs');

const SEED_DIR =
  process.env.VOLTNET_SEED_DIR ||
  ['../docker/seed', '../../docker/seed']
    .map((rel) => path.join(__dirname, rel))
    .find((dir) => fs.existsSync(path.join(dir, 'voltnet-ids.json')));

if (!SEED_DIR) {
  throw new Error('docker/seed not found. Set VOLTNET_SEED_DIR or run from the monorepo.');
}

const { STATION_PRICES_USD } = require(path.join(SEED_DIR, 'demo-pricing'));
const ids = JSON.parse(
  readFileSync(process.env.VOLTNET_IDS_PATH || path.join(SEED_DIR, 'voltnet-ids.json'), 'utf-8'),
);

const prisma = new PrismaClient();

const stations = [
  {
    id: ids.stations.poblado,
    name: 'Supercharger El Poblado',
    address: 'Cra 43A #5-113, El Poblado, Medellín',
    lat: 6.2088,
    lng: -75.5672,
    connectorsTotal: 4,
    maxKwThreshold: 150,
    pricePerKwh: STATION_PRICES_USD.poblado,
    enabled: true,
  },
  {
    id: ids.stations.estadio,
    name: 'Supercharger Estadio',
    address: 'Calle 48 #63-84, La Candelaria, Medellín',
    lat: 6.2518,
    lng: -75.5862,
    connectorsTotal: 6,
    maxKwThreshold: 200,
    pricePerKwh: STATION_PRICES_USD.estadio,
    enabled: true,
  },
  {
    id: ids.stations.laureles,
    name: 'Supercharger Laureles',
    address: 'Cra 70 #4-75, Laureles, Medellín',
    lat: 6.2442,
    lng: -75.5981,
    connectorsTotal: 3,
    maxKwThreshold: 120,
    pricePerKwh: STATION_PRICES_USD.laureles,
    enabled: true,
  },
  {
    id: ids.stations.disabled,
    name: 'Supercharger Centro (mantenimiento)',
    address: 'Calle 50 #46-60, Medellín',
    lat: 6.2476,
    lng: -75.5658,
    connectorsTotal: 2,
    maxKwThreshold: 80,
    pricePerKwh: STATION_PRICES_USD.disabled,
    enabled: false,
  },
];

async function main() {
  for (const station of stations) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: {
        name: station.name,
        address: station.address,
        lat: new Prisma.Decimal(station.lat),
        lng: new Prisma.Decimal(station.lng),
        connectorsTotal: station.connectorsTotal,
        maxKwThreshold: station.maxKwThreshold,
        pricePerKwh: new Prisma.Decimal(station.pricePerKwh),
        enabled: station.enabled,
      },
      create: {
        id: station.id,
        name: station.name,
        address: station.address,
        lat: new Prisma.Decimal(station.lat),
        lng: new Prisma.Decimal(station.lng),
        connectorsTotal: station.connectorsTotal,
        maxKwThreshold: station.maxKwThreshold,
        pricePerKwh: new Prisma.Decimal(station.pricePerKwh),
        enabled: station.enabled,
      },
    });
  }

  console.log(
    'stations-service seed OK (USD/kWh):',
    stations.map((s) => `${s.name} $${s.pricePerKwh}`).join(', '),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

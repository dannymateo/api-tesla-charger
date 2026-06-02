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

const { SESSIONS, sessionPriceSnapshot } = require(path.join(SEED_DIR, 'demo-pricing'));
const ids = JSON.parse(
  readFileSync(process.env.VOLTNET_IDS_PATH || path.join(SEED_DIR, 'voltnet-ids.json'), 'utf-8'),
);

const prisma = new PrismaClient();

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const sessions = [
  {
    id: ids.sessions.juanPaid,
    userId: ids.users.driver,
    stationId: ids.stations.poblado,
    ...SESSIONS.juanPaid,
    pricePerKwhSnapshot: sessionPriceSnapshot('juanPaid'),
    status: 'COMPLETED',
    rejectionReason: null,
    startedAt: daysAgo(10),
    endedAt: daysAgo(10),
    lastProgressAt: daysAgo(10),
  },
  {
    id: ids.sessions.mariaPending,
    userId: ids.users.maria,
    stationId: ids.stations.laureles,
    ...SESSIONS.mariaPending,
    pricePerKwhSnapshot: sessionPriceSnapshot('mariaPending'),
    status: 'STOPPED',
    rejectionReason: null,
    startedAt: daysAgo(3),
    endedAt: daysAgo(3),
    lastProgressAt: daysAgo(3),
  },
  {
    id: ids.sessions.blockedOverdue,
    userId: ids.users.blocked,
    stationId: ids.stations.poblado,
    ...SESSIONS.blockedOverdue,
    pricePerKwhSnapshot: sessionPriceSnapshot('blockedOverdue'),
    status: 'COMPLETED',
    rejectionReason: null,
    startedAt: daysAgo(40),
    endedAt: daysAgo(40),
    lastProgressAt: daysAgo(40),
  },
  {
    id: ids.sessions.mariaRejected,
    userId: ids.users.maria,
    stationId: ids.stations.poblado,
    ...SESSIONS.mariaRejected,
    pricePerKwhSnapshot: sessionPriceSnapshot('mariaRejected'),
    status: 'REJECTED',
    rejectionReason: 'STATION_SATURATED',
    startedAt: daysAgo(1),
    endedAt: daysAgo(1),
    lastProgressAt: null,
  },
];

async function main() {
  for (const session of sessions) {
    await prisma.chargingSession.upsert({
      where: { id: session.id },
      update: {
        userId: session.userId,
        stationId: session.stationId,
        requestedKwh: new Prisma.Decimal(session.requestedKwh),
        deliveredKwh: new Prisma.Decimal(session.deliveredKwh),
        pricePerKwhSnapshot: new Prisma.Decimal(session.pricePerKwhSnapshot),
        status: session.status,
        rejectionReason: session.rejectionReason,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        lastProgressAt: session.lastProgressAt,
      },
      create: {
        id: session.id,
        userId: session.userId,
        stationId: session.stationId,
        requestedKwh: new Prisma.Decimal(session.requestedKwh),
        deliveredKwh: new Prisma.Decimal(session.deliveredKwh),
        pricePerKwhSnapshot: new Prisma.Decimal(session.pricePerKwhSnapshot),
        status: session.status,
        rejectionReason: session.rejectionReason,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        lastProgressAt: session.lastProgressAt,
      },
    });
  }

  console.log('sessions-service seed OK:', sessions.length, 'sessions (USD/kWh snapshots)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

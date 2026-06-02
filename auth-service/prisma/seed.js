const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
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

const ids = JSON.parse(
  readFileSync(process.env.VOLTNET_IDS_PATH || path.join(SEED_DIR, 'voltnet-ids.json'), 'utf-8'),
);

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Tesla123!';
const passwordHash = () => hash(DEMO_PASSWORD, 10);

async function main() {
  const users = [
    {
      id: ids.users.admin,
      email: 'admin@tesla.local',
      role: 'ADMIN',
      vehicleModel: 'Tesla Model S',
      batteryKwh: 100,
      isBlocked: false,
    },
    {
      id: ids.users.driver,
      email: 'driver@tesla.local',
      role: 'USER',
      vehicleModel: 'Tesla Model 3',
      batteryKwh: 75,
      isBlocked: false,
    },
    {
      id: ids.users.maria,
      email: 'maria@tesla.local',
      role: 'USER',
      vehicleModel: 'Tesla Model Y',
      batteryKwh: 82,
      isBlocked: false,
    },
    {
      id: ids.users.blocked,
      email: 'blocked@tesla.local',
      role: 'USER',
      vehicleModel: 'Tesla Model 3',
      batteryKwh: 60,
      isBlocked: true,
    },
  ];

  for (const user of users) {
    const hashed = await passwordHash();
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        role: user.role,
        vehicleModel: user.vehicleModel,
        batteryKwh: user.batteryKwh,
        isBlocked: user.isBlocked,
        passwordHash: hashed,
      },
      create: { ...user, passwordHash: hashed },
    });
  }

  console.log('auth-service seed OK:', users.map((u) => u.email).join(', '));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

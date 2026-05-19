const { Prisma, PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const { join } = require('path');
const {
  SESSIONS,
  sessionPriceSnapshot,
  sessionTotal,
} = require('../../docker/seed/demo-pricing');

const idsPath =
  process.env.VOLTNET_IDS_PATH || join(__dirname, '../../docker/seed/voltnet-ids.json');
const ids = JSON.parse(readFileSync(idsPath, 'utf-8'));

const prisma = new PrismaClient();

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const invoiceSpecs = [
  {
    id: ids.invoices.juanPaid,
    userId: ids.users.driver,
    sessionId: ids.sessions.juanPaid,
    stationId: ids.stations.poblado,
    sessionKey: 'juanPaid',
    status: 'PAID',
    issuedAt: daysAgo(10),
    paidAt: daysAgo(9),
  },
  {
    id: ids.invoices.mariaPending,
    userId: ids.users.maria,
    sessionId: ids.sessions.mariaPending,
    stationId: ids.stations.laureles,
    sessionKey: 'mariaPending',
    status: 'PENDING',
    issuedAt: daysAgo(3),
    paidAt: null,
  },
  {
    id: ids.invoices.blockedOverdue,
    userId: ids.users.blocked,
    sessionId: ids.sessions.blockedOverdue,
    stationId: ids.stations.poblado,
    sessionKey: 'blockedOverdue',
    status: 'OVERDUE',
    issuedAt: daysAgo(40),
    paidAt: null,
  },
];

async function main() {
  for (const spec of invoiceSpecs) {
    const session = SESSIONS[spec.sessionKey];
    const unitPrice = sessionPriceSnapshot(spec.sessionKey);
    const total = sessionTotal(spec.sessionKey);

    await prisma.invoice.upsert({
      where: { id: spec.id },
      update: {
        userId: spec.userId,
        sessionId: spec.sessionId,
        stationId: spec.stationId,
        kwh: new Prisma.Decimal(session.deliveredKwh),
        unitPrice: new Prisma.Decimal(unitPrice),
        total: new Prisma.Decimal(total),
        status: spec.status,
        issuedAt: spec.issuedAt,
        paidAt: spec.paidAt,
      },
      create: {
        id: spec.id,
        userId: spec.userId,
        sessionId: spec.sessionId,
        stationId: spec.stationId,
        kwh: new Prisma.Decimal(session.deliveredKwh),
        unitPrice: new Prisma.Decimal(unitPrice),
        total: new Prisma.Decimal(total),
        status: spec.status,
        issuedAt: spec.issuedAt,
        paidAt: spec.paidAt,
      },
    });
  }

  const juanTotal = sessionTotal('juanPaid');

  await prisma.payment.upsert({
    where: { id: ids.payments.juanPaid },
    update: {
      paypalOrderId: 'SEED-PAYPAL-ORDER-001',
      paypalCaptureId: 'SEED-PAYPAL-CAPTURE-001',
      amount: new Prisma.Decimal(juanTotal),
      status: 'COMPLETED',
    },
    create: {
      id: ids.payments.juanPaid,
      paypalOrderId: 'SEED-PAYPAL-ORDER-001',
      paypalCaptureId: 'SEED-PAYPAL-CAPTURE-001',
      amount: new Prisma.Decimal(juanTotal),
      status: 'COMPLETED',
    },
  });

  await prisma.paymentInvoice.upsert({
    where: {
      paymentId_invoiceId: {
        paymentId: ids.payments.juanPaid,
        invoiceId: ids.invoices.juanPaid,
      },
    },
    update: {},
    create: {
      paymentId: ids.payments.juanPaid,
      invoiceId: ids.invoices.juanPaid,
    },
  });

  console.log(
    'billing-service seed OK (USD):',
    `driver $${juanTotal}`,
    `maria $${sessionTotal('mariaPending')}`,
    `blocked $${sessionTotal('blockedOverdue')}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

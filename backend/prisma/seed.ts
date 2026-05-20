import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const rides = [
    { id: 'R01', name: 'Thunder Coaster', emoji: '🎢' },
    { id: 'R02', name: 'Aqua Drop', emoji: '💧' },
    { id: 'R03', name: 'Sky Twister', emoji: '🌪️' },
    { id: 'R04', name: 'Dark Tunnel', emoji: '🚂' },
    { id: 'R05', name: 'Gravity Zone', emoji: '⚡' },
  ];

  for (const ride of rides) {
    await prisma.ride.upsert({
      where: { id: ride.id },
      update: {},
      create: ride,
    });
  }

  const hash = await bcrypt.hash('admin@123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      id: 'USR-ADMIN',
      username: 'admin',
      password: hash,
      role: 'admin',
      name: 'Administrator',
    },
  });

  console.log('Seed complete: rides + admin user (admin / admin@123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

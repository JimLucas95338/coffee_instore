import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding manager user...');

  const email = process.env.SEED_MANAGER_EMAIL || 'manager@ecocoffee.com';
  const password = process.env.SEED_MANAGER_PASSWORD || 'manager123';

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { isActive: true, role: 'MANAGER', passwordHash: hash },
    create: {
      email,
      name: 'Store Manager',
      passwordHash: hash,
      role: 'MANAGER',
      isActive: true,
      approvedAt: new Date(),
    },
  });
  console.log(`  ✓ Manager: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

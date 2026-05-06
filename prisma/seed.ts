import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user...');

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@ecocoffee.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { isActive: true, role: 'ADMIN', passwordHash: hash },
    create: {
      email,
      name: 'Admin',
      passwordHash: hash,
      role: 'ADMIN',
      isActive: true,
      approvedAt: new Date(),
    },
  });
  console.log(`  ✓ Admin: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

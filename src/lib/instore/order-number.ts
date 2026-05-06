import { db } from '@/lib/db';

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `C${year}${month}-${random}`;
}

export async function getNextDisplayNumber(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastOrder = await db.inStoreOrder.findFirst({
    where: { createdAt: { gte: today } },
    orderBy: { displayNumber: 'desc' },
    select: { displayNumber: true },
  });

  return (lastOrder?.displayNumber ?? 0) + 1;
}

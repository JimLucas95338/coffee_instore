import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateCupLabelThermal,
  generateCupLabelReceipt,
  type CupLabelItem,
} from '@/lib/instore/generate-cup-label';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'thermal';

    const order = await db.inStoreOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: { select: { name: true, category: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const labelItems: CupLabelItem[] = order.items.map((item) => {
      let addOns: { name: string; price: number }[] = [];
      if (item.addOns) {
        try {
          addOns = JSON.parse(item.addOns);
        } catch {
          // ignore parse errors
        }
      }
      return {
        drinkName: item.menuItem.name,
        category: item.menuItem.category,
        size: item.size,
        milkType: item.milkType,
        temperature: item.temperature,
        addOns,
        notes: item.notes,
        quantity: item.quantity,
      };
    });

    const labelData = {
      displayNumber: order.displayNumber,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      items: labelItems,
      createdAt: order.createdAt,
    };

    const pdfBuffer =
      format === 'receipt'
        ? generateCupLabelReceipt(labelData)
        : generateCupLabelThermal(labelData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="cup-label-${order.displayNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating cup label:', error);
    return NextResponse.json({ error: 'Failed to generate label' }, { status: 500 });
  }
}

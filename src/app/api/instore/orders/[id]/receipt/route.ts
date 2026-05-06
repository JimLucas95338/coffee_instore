import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateReceiptThermal,
  generateReceiptStandard,
  type ReceiptItem,
} from '@/lib/instore/generate-receipt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'receipt';

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

    const receiptItems: ReceiptItem[] = order.items.map((item) => {
      let addOns: { name: string; price: number }[] = [];
      if (item.addOns) {
        try { addOns = JSON.parse(item.addOns); } catch { /* ignore */ }
      }
      return {
        name: item.menuItem.name,
        size: item.size,
        milkType: item.milkType,
        temperature: item.temperature,
        addOns,
        notes: item.notes,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      };
    });

    const receiptData = {
      orderNumber: order.orderNumber,
      displayNumber: order.displayNumber,
      customerName: order.customerName,
      items: receiptItems,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      source: order.source,
      createdAt: order.createdAt,
    };

    const pdfBuffer = format === 'standard'
      ? generateReceiptStandard(receiptData)
      : generateReceiptThermal(receiptData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${order.displayNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 });
  }
}

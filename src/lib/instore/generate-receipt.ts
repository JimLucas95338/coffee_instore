import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface ReceiptItem {
  name: string;
  size: string | null;
  milkType: string | null;
  temperature: string | null;
  addOns: { name: string; price: number }[];
  notes: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptData {
  orderNumber: string;
  displayNumber: number;
  customerName: string | null;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  source: string;
  createdAt: Date;
  loyaltyPoints?: number;
}

const SIZE_MAP: Record<string, string> = {
  SMALL: 'SM', MEDIUM: 'MD', LARGE: 'LG',
};

const MILK_MAP: Record<string, string> = {
  WHOLE: 'Whole', TWO_PERCENT: '2%', OAT: 'Oat', ALMOND: 'Almond',
  SOY: 'Soy', COCONUT: 'Coconut', NONE: '',
};

/**
 * Generate a receipt-style PDF (80mm wide thermal receipt)
 */
export function generateReceiptThermal(data: ReceiptData): Buffer {
  const WIDTH = 80;
  // Estimate height
  const itemLines = data.items.reduce((sum, i) => {
    let lines = 1; // name line
    if (i.size || i.milkType || i.temperature) lines++;
    lines += i.addOns.length;
    if (i.notes) lines++;
    return sum + lines;
  }, 0);
  const height = 70 + itemLines * 4 + data.items.length * 6;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [WIDTH, height] });
  const cx = WIDTH / 2;
  let y = 5;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ECO DELIGHT COFFEE', cx, y, { align: 'center' });
  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('9731 Dino Dr, Suite 130', cx, y, { align: 'center' });
  y += 3;
  doc.text('Elk Grove, CA 95624', cx, y, { align: 'center' });
  y += 5;

  // Divider
  doc.setFontSize(6);
  doc.text('='.repeat(48), cx, y, { align: 'center' });
  y += 4;

  // Order info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${data.displayNumber}`, cx, y, { align: 'center' });
  y += 5;

  if (data.customerName) {
    doc.setFontSize(10);
    doc.text(data.customerName, cx, y, { align: 'center' });
    y += 4;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(format(data.createdAt, 'MMM d, yyyy h:mm a'), cx, y, { align: 'center' });
  y += 3;
  doc.text(`${data.source === 'KIOSK' ? 'Kiosk' : 'Counter'} Order`, cx, y, { align: 'center' });
  y += 4;

  // Divider
  doc.setFontSize(6);
  doc.text('-'.repeat(48), cx, y, { align: 'center' });
  y += 4;

  // Items
  for (const item of data.items) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
    doc.text(`${qty}${item.name}`, 4, y);
    doc.text(`$${item.totalPrice.toFixed(2)}`, WIDTH - 4, y, { align: 'right' });
    y += 4;

    // Customizations
    const mods: string[] = [];
    if (item.size) mods.push(SIZE_MAP[item.size] || item.size);
    if (item.temperature) mods.push(item.temperature);
    if (item.milkType && item.milkType !== 'NONE' && item.milkType !== 'WHOLE') {
      mods.push(MILK_MAP[item.milkType] || item.milkType);
    }
    if (mods.length > 0) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`  ${mods.join(' / ')}`, 4, y);
      y += 3;
    }

    for (const addOn of item.addOns) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`  + ${addOn.name}`, 4, y);
      doc.text(`$${addOn.price.toFixed(2)}`, WIDTH - 4, y, { align: 'right' });
      y += 3;
    }

    if (item.notes) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text(`  "${item.notes}"`, 4, y);
      y += 3;
    }

    y += 1;
  }

  // Divider
  doc.setFontSize(6);
  doc.text('-'.repeat(48), cx, y, { align: 'center' });
  y += 4;

  // Totals
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', 4, y);
  doc.text(`$${data.subtotal.toFixed(2)}`, WIDTH - 4, y, { align: 'right' });
  y += 4;

  doc.text('Tax', 4, y);
  doc.text(`$${data.tax.toFixed(2)}`, WIDTH - 4, y, { align: 'right' });
  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 4, y);
  doc.text(`$${data.total.toFixed(2)}`, WIDTH - 4, y, { align: 'right' });
  y += 5;

  // Payment method
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const payMethod = data.paymentMethod === 'CASH' ? 'Cash' : 'Card';
  const payStatus = data.paymentStatus === 'PAID' ? 'PAID' : 'PENDING';
  doc.text(`${payMethod} - ${payStatus}`, cx, y, { align: 'center' });
  y += 4;

  // Loyalty points
  if (data.loyaltyPoints && data.loyaltyPoints > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${data.loyaltyPoints} loyalty points earned`, cx, y, { align: 'center' });
    y += 4;
  }

  // Divider
  doc.setFontSize(6);
  doc.text('='.repeat(48), cx, y, { align: 'center' });
  y += 4;

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you!', cx, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate a standard letter-size receipt PDF
 */
export function generateReceiptStandard(data: ReceiptData): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cx = pageWidth / 2;
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ECO DELIGHT COFFEE', cx, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('9731 Dino Dr, Suite 130, Elk Grove, CA 95624', cx, y, { align: 'center' });
  y += 10;

  // Order info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order #${data.displayNumber}`, margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order: ${data.orderNumber}`, margin, y);
  doc.text(format(data.createdAt, 'MMMM d, yyyy h:mm a'), pageWidth - margin, y, { align: 'right' });
  y += 5;
  if (data.customerName) {
    doc.text(`Customer: ${data.customerName}`, margin, y);
    y += 5;
  }
  y += 3;

  // Line
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Items table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', margin, y);
  doc.text('Qty', pageWidth - margin - 50, y, { align: 'center' });
  doc.text('Price', pageWidth - margin - 25, y, { align: 'right' });
  doc.text('Total', pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Items
  doc.setFont('helvetica', 'normal');
  for (const item of data.items) {
    doc.setFontSize(10);
    doc.text(item.name, margin, y);
    doc.text(String(item.quantity), pageWidth - margin - 50, y, { align: 'center' });
    doc.text(`$${item.unitPrice.toFixed(2)}`, pageWidth - margin - 25, y, { align: 'right' });
    doc.text(`$${item.totalPrice.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;

    // Details
    const mods: string[] = [];
    if (item.size) mods.push(SIZE_MAP[item.size] || item.size);
    if (item.temperature) mods.push(item.temperature);
    if (item.milkType && item.milkType !== 'NONE' && item.milkType !== 'WHOLE') {
      mods.push(MILK_MAP[item.milkType] || item.milkType);
    }
    for (const a of item.addOns) mods.push(`+${a.name}`);
    if (item.notes) mods.push(`"${item.notes}"`);

    if (mods.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`  ${mods.join(' / ')}`, margin, y);
      doc.setTextColor(0);
      y += 4;
    }

    y += 1;
  }

  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Totals
  doc.setFontSize(10);
  doc.text('Subtotal', pageWidth - margin - 45, y);
  doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.text('Tax', pageWidth - margin - 45, y);
  doc.text(`$${data.tax.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', pageWidth - margin - 45, y);
  doc.text(`$${data.total.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const payMethod = data.paymentMethod === 'CASH' ? 'Cash' : 'Card';
  doc.text(`Payment: ${payMethod}`, pageWidth - margin - 45, y);

  return Buffer.from(doc.output('arraybuffer'));
}

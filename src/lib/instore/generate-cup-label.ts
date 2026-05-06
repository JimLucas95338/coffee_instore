import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface CupLabelItem {
  drinkName: string;
  category: string;
  size: string | null;
  milkType: string | null;
  temperature: string | null;
  addOns: { name: string; price: number }[];
  notes: string | null;
  quantity: number;
}

export interface CupLabelData {
  displayNumber: number;
  orderNumber: string;
  customerName: string | null;
  items: CupLabelItem[];
  createdAt: Date;
}

const SIZE_MAP: Record<string, string> = {
  SMALL: 'SM',
  MEDIUM: 'MD',
  LARGE: 'LG',
};

const MILK_MAP: Record<string, string> = {
  WHOLE: 'Whole',
  TWO_PERCENT: '2%',
  OAT: 'Oat',
  ALMOND: 'Almond',
  SOY: 'Soy',
  COCONUT: 'Coconut',
  NONE: '',
};

function formatCustomizations(item: CupLabelItem): string[] {
  const lines: string[] = [];

  const parts: string[] = [];
  if (item.size) parts.push(SIZE_MAP[item.size] || item.size);
  if (item.temperature) parts.push(item.temperature === 'ICED' ? 'ICED' : 'HOT');
  if (item.milkType && item.milkType !== 'NONE' && item.milkType !== 'WHOLE') {
    parts.push(MILK_MAP[item.milkType] || item.milkType);
  }
  if (parts.length > 0) lines.push(parts.join(' | '));

  for (const addOn of item.addOns) {
    lines.push(`+ ${addOn.name}`);
  }
  if (item.notes) {
    lines.push(`"${item.notes}"`);
  }
  return lines;
}

/**
 * Generate thermal label PDF (62mm x 29mm / 2.4" x 1.1")
 * One page per drink item. Skips FOOD category items.
 */
export function generateCupLabelThermal(data: CupLabelData): Buffer {
  const WIDTH = 68; // mm (62mm label + margins)
  const HEIGHT = 30; // mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [HEIGHT, WIDTH] });

  const drinkItems = data.items.filter((i) => i.category !== 'FOOD');
  if (drinkItems.length === 0) {
    // Return empty PDF
    return Buffer.from(doc.output('arraybuffer'));
  }

  drinkItems.forEach((item, index) => {
    if (index > 0) doc.addPage([HEIGHT, WIDTH], 'landscape');

    const timestamp = format(data.createdAt, 'h:mm a');

    // Order number + time (top row)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${data.displayNumber}`, 2, 4);
    doc.text(timestamp, WIDTH - 2, 4, { align: 'right' });

    // Customer name
    if (data.customerName) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(data.customerName.toUpperCase(), 2, 9);
    }

    // Drink name (large)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const nameY = data.customerName ? 15 : 11;
    doc.text(item.drinkName.toUpperCase(), 2, nameY);

    // Customizations
    const customLines = formatCustomizations(item);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let y = nameY + 4;
    for (const line of customLines) {
      if (y > HEIGHT - 2) break;
      doc.text(line, 2, y);
      y += 3.2;
    }

    // Quantity if > 1
    if (item.quantity > 1) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`x${item.quantity}`, WIDTH - 2, HEIGHT - 2, { align: 'right' });
    }
  });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate receipt-style label PDF (80mm wide, variable height)
 * All drink items on one continuous receipt. Skips FOOD category items.
 */
export function generateCupLabelReceipt(data: CupLabelData): Buffer {
  const WIDTH = 80; // mm (standard receipt width)

  const drinkItems = data.items.filter((i) => i.category !== 'FOOD');
  if (drinkItems.length === 0) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [WIDTH, 50] });
    return Buffer.from(doc.output('arraybuffer'));
  }

  // Estimate height: header (20mm) + per item (~25mm each) + footer (10mm)
  const estimatedHeight = 22 + drinkItems.length * 28 + 10;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [WIDTH, estimatedHeight] });

  const centerX = WIDTH / 2;
  let y = 4;

  // Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ECO DELIGHT COFFEE', centerX, y, { align: 'center' });
  y += 5;

  // Dashed line
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('- '.repeat(30), centerX, y, { align: 'center' });
  y += 4;

  // Order info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORDER #${data.displayNumber}`, centerX, y, { align: 'center' });
  y += 5;

  if (data.customerName) {
    doc.setFontSize(12);
    doc.text(data.customerName.toUpperCase(), centerX, y, { align: 'center' });
    y += 5;
  }

  const timestamp = format(data.createdAt, 'h:mm a');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(timestamp, centerX, y, { align: 'center' });
  y += 4;

  // Dashed line
  doc.setFontSize(7);
  doc.text('- '.repeat(30), centerX, y, { align: 'center' });
  y += 4;

  // Items
  for (const item of drinkItems) {
    // Drink name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const qtyPrefix = item.quantity > 1 ? `${item.quantity}x ` : '';
    doc.text(`${qtyPrefix}${item.drinkName.toUpperCase()}`, 4, y);
    y += 5;

    // Customizations
    const customLines = formatCustomizations(item);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    for (const line of customLines) {
      doc.text(`  ${line}`, 4, y);
      y += 3.8;
    }

    y += 3;

    // Separator between items
    if (drinkItems.indexOf(item) < drinkItems.length - 1) {
      doc.setFontSize(7);
      doc.text('. '.repeat(30), centerX, y, { align: 'center' });
      y += 4;
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}

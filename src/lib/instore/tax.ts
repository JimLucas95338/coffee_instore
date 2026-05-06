const TAX_RATE = parseFloat(process.env.INSTORE_TAX_RATE || '0.08');

export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}

export function getTaxRate(): number {
  return TAX_RATE;
}

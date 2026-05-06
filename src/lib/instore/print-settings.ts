import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrinterType = 'thermal' | 'receipt' | 'none';

interface PrintSettings {
  printerType: PrinterType;
  autoPrint: boolean;
  setPrinterType: (type: PrinterType) => void;
  setAutoPrint: (auto: boolean) => void;
}

export const usePrintSettings = create<PrintSettings>()(
  persist(
    (set) => ({
      printerType: 'none',
      autoPrint: false,
      setPrinterType: (printerType) => set({ printerType }),
      setAutoPrint: (autoPrint) => set({ autoPrint }),
    }),
    { name: 'eco-instore-print-settings' }
  )
);

/**
 * Print a cup label for an order. Opens the PDF in a new window and triggers print.
 */
export async function printCupLabel(orderId: string, printerType: PrinterType): Promise<void> {
  if (printerType === 'none') return;

  const format = printerType === 'receipt' ? 'receipt' : 'thermal';
  const res = await fetch(`/api/instore/orders/${orderId}/label?format=${format}`);
  if (!res.ok) {
    console.error('Failed to fetch cup label');
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  // Open in a hidden iframe to trigger print without navigating away
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow?.print();
    // Clean up after a delay to allow print dialog to open
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 5000);
  };
}

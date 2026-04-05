import { useMemo } from 'react';
import { generateInvoiceMarkdown } from '@/lib/invoiceGenerator';

interface InvoiceViewProps {
  sitterName: string;
  clientName: string;
  dogName: string;
  startDate: string;
  endDate: string;
  subtotal: number;
  tipAmount?: number;
  paymentNotes?: string | null;
}

export function InvoiceView(props: InvoiceViewProps) {
  const markdown = useMemo(() => generateInvoiceMarkdown(props), [props]);

  return (
    <section className="surface-card p-4">
      <h2 className="text-sm font-black text-bark uppercase tracking-wide mb-2">Invoice Preview</h2>
      <pre className="text-xs whitespace-pre-wrap text-bark-light">{markdown}</pre>
    </section>
  );
}

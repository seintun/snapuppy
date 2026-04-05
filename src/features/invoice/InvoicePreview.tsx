import { useMemo } from 'react';
import { buildInvoiceHtml } from '@/lib/invoiceTemplate';
import { buildInvoiceShareLink } from '@/lib/invoiceService';
import type { InvoiceInput } from '@/lib/invoiceGenerator';

interface InvoicePreviewProps {
  bookingId: string;
  invoice: InvoiceInput & { logoUrl?: string | null; paymentInstructions?: string | null; isPaid?: boolean };
}

export function InvoicePreview({ bookingId, invoice }: InvoicePreviewProps) {
  const html = useMemo(() => buildInvoiceHtml(invoice), [invoice]);
  const shareLink = useMemo(() => buildInvoiceShareLink(bookingId), [bookingId]);

  return (
    <section className="surface-card p-4 space-y-3">
      <h2 className="text-sm font-black text-bark uppercase tracking-wide">Invoice Preview</h2>
      <div className="rounded-lg border border-pebble/30 bg-white p-3" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-sage" onClick={() => window.print()}>
          Print
        </button>
        <a className="btn-sage" href={shareLink} target="_blank" rel="noreferrer">
          Open Share Link
        </a>
      </div>
    </section>
  );
}

import { useContext, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { ToastContext } from '@/components/ui/ToastContext';
import { buildInvoiceHtml } from '@/lib/invoiceTemplate';
import type { InvoiceInput } from '@/lib/invoiceGenerator';

interface InvoicePreviewProps {
  invoice: InvoiceInput & {
    logoUrl?: string | null;
    paymentInstructions?: string | null;
    documentLabel?: 'Invoice' | 'Receipt';
    isPaid?: boolean;
    selectedPaymentMethod?: string | null;
  };
  downloadName?: string;
}

export function InvoicePreview({ invoice, downloadName }: InvoicePreviewProps) {
  const toast = useContext(ToastContext);
  const html = useMemo(() => buildInvoiceHtml(invoice), [invoice]);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleDownloadPng = async () => {
    if (!invoiceRef.current) return;

    try {
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = downloadName ?? 'document.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download PNG';
      if (toast?.addToast) {
        toast.addToast(message, 'error');
      } else if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        console.error(message, error);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div ref={invoiceRef} dangerouslySetInnerHTML={{ __html: html }} />
      <button type="button" className="btn-sage w-full" onClick={() => void handleDownloadPng()}>
        Download PNG
      </button>
    </div>
  );
}

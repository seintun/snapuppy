import { calculateInvoiceTotals, type InvoiceInput } from '@/lib/invoiceGenerator';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildInvoiceHtml(
  input: InvoiceInput & {
    logoUrl?: string | null;
    paymentInstructions?: string | null;
    documentLabel?: 'Invoice' | 'Receipt';
    isPaid?: boolean;
  },
) {
  const { lineItems, hasLineItems, credit, subtotal, tip, total } = calculateInvoiceTotals(input);
  const documentLabel = input.documentLabel ?? 'Invoice';
  const sitterName = escapeHtml(input.sitterName);
  const clientName = escapeHtml(input.clientName);
  const dogName = escapeHtml(input.dogName);
  const paymentInstructions = input.paymentInstructions ? escapeHtml(input.paymentInstructions) : null;
  const paymentNotes = input.paymentNotes ? escapeHtml(input.paymentNotes) : null;
  const logoUrl = input.logoUrl ? escapeHtml(input.logoUrl) : null;
  const lineItemsHtml = hasLineItems
    ? lineItems
        .map((item) => {
          const typeLabel = item.type === 'daycare' ? 'Daycare' : 'Boarding';
          const holidayLabel = item.isHoliday ? ' Holiday' : '';
          const unitLabel = item.type === 'daycare' ? 'day' : 'night';
          const lineTotal = item.count * item.rate;

          return `<p style="margin:0 0 6px;">${typeLabel}${holidayLabel} x ${item.count} ${unitLabel}${item.count === 1 ? '' : 's'} - $${item.rate.toFixed(2)}/ea - $${lineTotal.toFixed(2)}</p>`;
        })
        .join('')
    : '';

  return `
    <section style="font-family: Nunito, sans-serif; padding: 16px; color: #4A3728;">
      <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h1 style="margin:0; font-size:20px;">${documentLabel}</h1>
          <p style="margin:4px 0 0;">${sitterName}</p>
          ${input.isPaid ? '<p style="margin:4px 0 0; font-weight:700; color:#2E7D32;">PAID</p>' : ''}
        </div>
        ${logoUrl ? `<img src="${logoUrl}" alt="Business logo" style="height:48px; width:48px; object-fit:cover; border-radius:8px;" />` : ''}
      </header>
      <p>Client: ${clientName}</p>
      <p>Dog: ${dogName}</p>
      ${hasLineItems ? `<div style="margin: 12px 0;">${lineItemsHtml}${credit > 0 ? `<p style="margin:0 0 6px;">Credit: -$${credit.toFixed(2)}</p>` : ''}</div>` : ''}
      <p>Subtotal: $${subtotal.toFixed(2)}</p>
      <p>Tip: $${tip.toFixed(2)}</p>
      <p><strong>Total: $${total.toFixed(2)}</strong></p>
      ${paymentInstructions ? `<p>Payment instructions: ${paymentInstructions}</p>` : ''}
      ${paymentNotes ? `<p>Notes: ${paymentNotes}</p>` : ''}
    </section>
  `;
}

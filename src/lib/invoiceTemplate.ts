import type { InvoiceInput } from '@/lib/invoiceGenerator';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildInvoiceHtml(input: InvoiceInput & { logoUrl?: string | null; paymentInstructions?: string | null }) {
  const tip = input.tipAmount ?? 0;
  const total = input.subtotal + tip;
  const sitterName = escapeHtml(input.sitterName);
  const clientName = escapeHtml(input.clientName);
  const dogName = escapeHtml(input.dogName);
  const paymentInstructions = input.paymentInstructions ? escapeHtml(input.paymentInstructions) : null;
  const paymentNotes = input.paymentNotes ? escapeHtml(input.paymentNotes) : null;
  const logoUrl = input.logoUrl ? escapeHtml(input.logoUrl) : null;

  return `
    <section style="font-family: Nunito, sans-serif; padding: 16px; color: #4A3728;">
      <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h1 style="margin:0; font-size:20px;">Invoice</h1>
          <p style="margin:4px 0 0;">${sitterName}</p>
        </div>
        ${logoUrl ? `<img src="${logoUrl}" alt="Business logo" style="height:48px; width:48px; object-fit:cover; border-radius:8px;" />` : ''}
      </header>
      <p>Client: ${clientName}</p>
      <p>Dog: ${dogName}</p>
      <p>Subtotal: $${input.subtotal.toFixed(2)}</p>
      <p>Tip: $${tip.toFixed(2)}</p>
      <p><strong>Total: $${total.toFixed(2)}</strong></p>
      ${paymentInstructions ? `<p>Payment instructions: ${paymentInstructions}</p>` : ''}
      ${paymentNotes ? `<p>Notes: ${paymentNotes}</p>` : ''}
    </section>
  `;
}

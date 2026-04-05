import type { InvoiceInput } from '@/lib/invoiceGenerator';

export function buildInvoiceHtml(input: InvoiceInput & { logoUrl?: string | null; paymentInstructions?: string | null }) {
  const tip = input.tipAmount ?? 0;
  const total = input.subtotal + tip;

  return `
    <section style="font-family: Nunito, sans-serif; padding: 16px; color: #4A3728;">
      <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h1 style="margin:0; font-size:20px;">Invoice</h1>
          <p style="margin:4px 0 0;">${input.sitterName}</p>
        </div>
        ${input.logoUrl ? `<img src="${input.logoUrl}" alt="Business logo" style="height:48px; width:48px; object-fit:cover; border-radius:8px;" />` : ''}
      </header>
      <p>Client: ${input.clientName}</p>
      <p>Dog: ${input.dogName}</p>
      <p>Subtotal: $${input.subtotal.toFixed(2)}</p>
      <p>Tip: $${tip.toFixed(2)}</p>
      <p><strong>Total: $${total.toFixed(2)}</strong></p>
      ${input.paymentInstructions ? `<p>Payment instructions: ${input.paymentInstructions}</p>` : ''}
      ${input.paymentNotes ? `<p>Notes: ${input.paymentNotes}</p>` : ''}
    </section>
  `;
}

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
  const {
    lineItems,
    adjustments,
    hasLineItems,
    adjustmentCharges,
    adjustmentDiscounts,
    credit,
    subtotal,
    tip,
    total,
  } = calculateInvoiceTotals(input);
  const documentLabel = input.documentLabel ?? 'Invoice';
  const showTip = documentLabel === 'Receipt';
  const displayedTip = showTip ? tip : 0;
  const displayedTotal = showTip ? total : subtotal;
  const sitterName = escapeHtml(input.sitterName);
  const clientName = escapeHtml(input.clientName);
  const dogName = escapeHtml(input.dogName);
  const paymentInstructions = input.paymentInstructions
    ? escapeHtml(input.paymentInstructions)
    : null;
  const paymentNotes = input.paymentNotes ? escapeHtml(input.paymentNotes) : null;
  const logoUrl = input.logoUrl ? escapeHtml(input.logoUrl) : null;
  const lineItemsHtml = hasLineItems
    ? lineItems
        .map((item) => {
          const typeLabel = item.type === 'daycare' ? 'Daycare' : 'Boarding';
          const holidayLabel = item.isHoliday ? ' Holiday' : '';
          const unitLabel = item.type === 'daycare' ? 'day' : 'night';
          const lineTotal = item.count * item.rate;

          return `<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:8px 0; border-bottom:1px solid #e2d8ce;"><div><p style="margin:0; font-size:13px; font-weight:800; letter-spacing:0.02em; color:#4A3728;">${typeLabel}${holidayLabel}</p><p style="margin:4px 0 0; font-size:12px; color:#7a6657;">${item.count} ${unitLabel}${item.count === 1 ? '' : 's'} x $${item.rate.toFixed(2)} / ${unitLabel}</p></div><p style="margin:0; font-size:14px; font-weight:900; color:#4A3728;">$${lineTotal.toFixed(2)}</p></div>`;
        })
        .join('')
    : '';

  const adjustmentsHtml = adjustments
    .map((adjustment) => {
      const isCharge = adjustment.kind === 'charge';
      const label = isCharge ? 'Charge' : 'Discount';
      const sign = isCharge ? '+' : '-';
      const color = isCharge ? '#8FB886' : '#D4845A';
      const description = adjustment.description.length
        ? ` - ${escapeHtml(adjustment.description)}`
        : '';

      return `<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:6px 0;"><p style="margin:0; font-size:12px; color:#5b4a3e;">${label}${description}</p><p style="margin:0; font-size:13px; font-weight:800; color:${color};">${sign}$${adjustment.amount.toFixed(2)}</p></div>`;
    })
    .join('');

  const adjustmentsBlock = adjustmentsHtml.length
    ? `<div style="margin-top:10px; padding:10px 12px; border:1px solid #e2d8ce; border-radius:12px; background:#fdfbf7;"><p style="margin:0 0 6px; font-size:10px; font-weight:900; letter-spacing:0.08em; text-transform:uppercase; color:#8a786a;">Adjustments</p>${adjustmentsHtml}</div>`
    : '';

  return `
    <section style="font-family: Nunito, sans-serif; padding: 16px; color: #4A3728; background:#f5f0eb; border:1px solid #e2d8ce; border-radius:16px;">
      <header style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:14px;">
        <div>
          <h1 style="margin:0; font-size:22px; line-height:1.05; letter-spacing:-0.02em;">${documentLabel}</h1>
          <p style="margin:4px 0 0; font-size:12px; color:#7a6657; font-weight:700;">${sitterName}</p>
          ${input.isPaid ? '<p style="margin:6px 0 0; display:inline-block; font-size:11px; font-weight:900; letter-spacing:0.08em; text-transform:uppercase; color:#2e7d32; background:#e8f4ea; border:1px solid #b7d8bc; padding:3px 8px; border-radius:999px;">Paid</p>' : ''}
        </div>
        ${logoUrl ? `<img src="${logoUrl}" alt="Business logo" style="height:48px; width:48px; object-fit:cover; border-radius:8px;" />` : ''}
      </header>
      <div style="display:grid; gap:8px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; gap:12px; font-size:12px;"><p style="margin:0; color:#7a6657;">Client</p><p style="margin:0; font-weight:800; color:#4A3728;">${clientName}</p></div>
        <div style="display:flex; justify-content:space-between; gap:12px; font-size:12px;"><p style="margin:0; color:#7a6657;">Dog</p><p style="margin:0; font-weight:800; color:#4A3728;">${dogName}</p></div>
      </div>
      ${hasLineItems ? `<div style="margin: 0 0 10px; padding:10px 12px; border:1px solid #d8ccbF; border-radius:12px; background:linear-gradient(to bottom,#edf4ea,#fdfbf7);"><p style="margin:0 0 6px; font-size:10px; font-weight:900; letter-spacing:0.08em; text-transform:uppercase; color:#8a786a;">Invoice Breakdown</p>${lineItemsHtml}${credit > 0 ? `<div style="display:flex; justify-content:space-between; padding-top:8px;"><p style="margin:0; font-size:12px; color:#7a6657;">Credit</p><p style="margin:0; font-size:13px; font-weight:800; color:#D4845A;">-$${credit.toFixed(2)}</p></div>` : ''}</div>` : ''}
      ${adjustmentsBlock}
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid #e2d8ce; display:grid; gap:6px;">
        <div style="display:flex; justify-content:space-between;"><p style="margin:0; font-size:12px; color:#7a6657;">Subtotal</p><p style="margin:0; font-size:13px; font-weight:800;">$${subtotal.toFixed(2)}</p></div>
        ${adjustmentCharges > 0 ? `<div style="display:flex; justify-content:space-between;"><p style="margin:0; font-size:12px; color:#7a6657;">Charges</p><p style="margin:0; font-size:13px; font-weight:800; color:#8FB886;">+$${adjustmentCharges.toFixed(2)}</p></div>` : ''}
        ${adjustmentDiscounts > 0 ? `<div style="display:flex; justify-content:space-between;"><p style="margin:0; font-size:12px; color:#7a6657;">Discounts</p><p style="margin:0; font-size:13px; font-weight:800; color:#D4845A;">-$${adjustmentDiscounts.toFixed(2)}</p></div>` : ''}
        ${showTip ? `<div style="display:flex; justify-content:space-between;"><p style="margin:0; font-size:12px; color:#7a6657;">Tip</p><p style="margin:0; font-size:13px; font-weight:800;">$${displayedTip.toFixed(2)}</p></div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:flex-end;"><p style="margin:0; font-size:11px; font-weight:900; letter-spacing:0.08em; text-transform:uppercase; color:#8a786a;">Total</p><p style="margin:0; font-size:30px; line-height:1; font-weight:900; letter-spacing:-0.02em; color:#D4845A;">$${displayedTotal.toFixed(2)}</p></div>
      </div>
      ${paymentInstructions ? `<p style="margin:12px 0 0; font-size:12px; color:#5b4a3e;"><strong>Payment instructions:</strong> ${paymentInstructions}</p>` : ''}
      ${paymentNotes ? `<p style="margin:8px 0 0; font-size:12px; color:#5b4a3e;"><strong>Notes:</strong> ${paymentNotes}</p>` : ''}
    </section>
  `;
}

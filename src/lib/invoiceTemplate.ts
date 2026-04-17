import { calculateInvoiceTotals, type InvoiceInput } from '@/lib/invoiceGenerator';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function unescapeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function getParsedPaymentMethods(instructions: string | null | undefined): any[] | null {
  if (!instructions) return null;
  try {
    // 1. First, try to clean extreme escaping or double-stringified artifacts
    let raw = unescapeHtml(instructions.trim());
    
    // 2. Clear any leading/trailing quotes if it was double-stringified as a string literal
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = JSON.parse(raw);
    }
    
    if (!raw.startsWith('[') || !raw.endsWith(']')) return null;
    
    let parsed = JSON.parse(raw);
    // 3. Handle potential secondary stringification
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    
    return Array.isArray(parsed) && parsed.length > 0 && parsed[0].type ? parsed : null;
  } catch (e) {
    console.error('Payment parsing failed:', e);
    return null;
  }
}

function renderPaymentBlock(instructions: string | null | undefined): string {
  const methods: any[] = [{ type: 'cash', handle: 'Cash' }];
  const parsed = getParsedPaymentMethods(instructions);
  if (parsed) methods.push(...parsed);

  if (methods.length > 0) {
    const badgesHtml = methods
      .map((m: any) => {
        const type = (m.type || '').toLowerCase();
        let handle = m.handle || '';
        
        // Auto-format Zelle phone numbers
        if (type === 'zelle' && /^\d+$/.test(handle.replace(/\D/g, ''))) {
          handle = formatPhoneNumber(handle);
        }
        
        const escapedHandle = escapeHtml(handle);
        const config = {
          venmo: { bg: '#e8f4ff', text: '#008cff', handleText: '#0076db', label: 'Venmo', initial: 'V' },
          cashapp: { bg: '#e6fff0', text: '#00c352', handleText: '#00a345', label: 'Cash App', initial: '$' },
          zelle: { bg: '#f3ebff', text: '#6d1edb', handleText: '#5b17bb', label: 'Zelle', initial: 'Z' },
          cash: { bg: '#eef5ee', text: '#5a8f56', handleText: '#4a7c44', label: 'Payment', initial: '💵' },
        }[type as 'venmo' | 'cashapp' | 'zelle' | 'cash'] || {
          bg: '#f0f4f0',
          text: '#5a8f56',
          handleText: '#5b4a3e',
          label: 'Payment',
          initial: 'P',
        };

        return `<div style="display:inline-flex; align-items:center; gap:6px; background:${config.bg}; border-radius:999px; padding:4px 8px 4px 4px; border:1px solid rgba(0,0,0,0.05); margin:2px 0;">
          <div style="width:24px; height:24px; border-radius:50%; background:#fff; color:${config.text}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; flex-shrink:0;">
            ${config.initial}
          </div>
          <div style="display:flex; flex-direction:column; line-height:1.0;">
            <span style="font-size:7px; font-weight:900; color:${config.text}cc; text-transform:uppercase; letter-spacing:0.02em;">${config.label}</span>
            <span style="font-size:12px; font-weight:900; color:${config.handleText}; letter-spacing:-0.01em;">${escapedHandle}</span>
          </div>
        </div>`;
      })
      .join('');

    return `
      <div style="margin-top:10px; padding:8px 12px; background:#fff; border-radius:12px; border:1px solid #e2d8ce;">
        <div style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; color:#8b7355; margin-bottom:6px; display:flex; align-items:center; gap:4px;">
          <span style="font-size:12px;">💵</span> FORMS OF PAYMENT ACCEPTED
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          ${badgesHtml}
        </div>
      </div>`;
  }

  // Legacy fallback
  return `
    <div style="margin-top:10px; padding:10px 12px; background:#fff; border-radius:12px; border:1px solid #e2d8ce;">
      <div style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; color:#8b7355; margin-bottom:4px;">Forms of Payment Accepted</div>
      <div style="font-size:11px; color:#4a3728; line-height:1.4;">${escapeHtml(instructions)}</div>
    </div>`;
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
    baseSubtotal,
  } = calculateInvoiceTotals(input);

  const documentLabel = input.documentLabel ?? 'Invoice';
  const showTip = documentLabel === 'Receipt';
  const displayedTip = showTip ? tip : 0;
  const displayedTotal = showTip ? total : subtotal;

  const sitterName = escapeHtml(input.sitterName);
  const clientName = escapeHtml(input.clientName);
  const dogName = escapeHtml(input.dogName);
  const dogInitial = escapeHtml((input.dogName.charAt(0) || '?').toUpperCase());
  const paymentInstructions = input.paymentInstructions ? escapeHtml(input.paymentInstructions) : null;
  const paymentNotes = input.paymentNotes ? escapeHtml(input.paymentNotes) : null;
  const logoUrl = input.logoUrl ? escapeHtml(input.logoUrl) : null;
  const dogPhotoUrl = input.dogPhotoUrl ? escapeHtml(input.dogPhotoUrl) : null;

  const startDateFormatted = formatDate(input.startDate);
  const endDateFormatted = formatDate(input.endDate);
  const isSameDate = input.startDate === input.endDate;
  const dateDisplay = isSameDate
    ? startDateFormatted
    : `${startDateFormatted} – ${endDateFormatted}`;

  // Dog avatar in header
  const dogAvatarInnerHtml = dogPhotoUrl
    ? `<img src="${dogPhotoUrl}" alt="${dogName}" crossorigin="anonymous" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`
    : `<span style="font-size:22px; font-weight:900; color:#4d7a47; line-height:1;">${dogInitial}</span>`;

  // Logo or sitter name top-right
  const headerRightHtml = logoUrl
    ? `<img src="${logoUrl}" alt="logo" crossorigin="anonymous" style="width:36px; height:36px; border-radius:8px; border:2px solid rgba(255,255,255,0.5); object-fit:cover;" />`
    : `<div style="text-align:right;">
         <div style="font-size:8px; font-weight:900; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1px;">Cared by</div>
         <div style="font-size:11px; font-weight:900; color:#fff; line-height:1.2; max-width:80px; word-break:break-word;">${sitterName} 🐾</div>
       </div>`;

  const paidBadgeHtml = input.isPaid
    ? `<div style="margin-top:6px; display:flex; justify-content:flex-end;"><div style="display:inline-flex; align-items:center; gap:3px; background:rgba(255,255,255,0.25); border:1px solid rgba(255,255,255,0.5); color:#fff; font-size:9px; font-weight:900; letter-spacing:0.1em; text-transform:uppercase; padding:3px 8px; border-radius:999px;">✓ PAID</div></div>`
    : '';

  // Line items
  const lineItemsRowsHtml = lineItems
    .map((item, idx) => {
      const typeLabel = item.type === 'daycare' ? 'Daycare' : 'Boarding';
      const holidayBadge = item.isHoliday
        ? `<span style="margin-left:6px; font-size:9px; font-weight:900; color:#c0603a; background:#fdeee8; border:1px solid #f0c4b4; border-radius:5px; padding:1px 5px; text-transform:uppercase; letter-spacing:0.05em; vertical-align:middle;">Holiday</span>`
        : '';
      const unitLabel = item.type === 'daycare' ? 'day' : 'night';
      const lineTotal = item.count * item.rate;
      const isLast = idx === lineItems.length - 1 && credit === 0;

      return `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:8px 0; ${isLast ? '' : 'border-bottom:1px solid #d8e8d6;'}">
        <div>
          <div style="font-size:13px; font-weight:800; color:#3a2e24;">${typeLabel}${holidayBadge}</div>
          <div style="font-size:11px; color:#7a9070; margin-top:2px;">${item.count} ${unitLabel}${item.count === 1 ? '' : 's'} × $${formatMoney(item.rate)}/${unitLabel}</div>
        </div>
        <div style="font-size:14px; font-weight:900; color:#3a2e24; flex-shrink:0;">$${formatMoney(lineTotal)}</div>
      </div>`;
    })
    .join('');

  const lineItemsBlock = hasLineItems
    ? `<div style="border:1px solid #b8d4b5; border-radius:12px; background:linear-gradient(to bottom, #edf4ea, #fafbf8); padding:10px 12px; margin-bottom:10px;">
        <div style="font-size:10px; font-weight:900; letter-spacing:0.09em; text-transform:uppercase; color:#6b9a66; margin-bottom:2px;">Service Breakdown</div>
        ${lineItemsRowsHtml}
      </div>`
    : '';

  // Adjustments list
  const adjustmentRowsHtml = adjustments
    .map((adj) => {
      const isCharge = adj.kind === 'charge';
      const sign = isCharge ? '+' : '−';
      const color = isCharge ? '#5a8f56' : '#c0603a';
      const label = adj.description.length
        ? escapeHtml(adj.description)
        : isCharge
          ? 'Additional charge'
          : 'Discount';

      return `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #e8ece8; font-size:12px;">
        <span style="color:#5b4a3e;">${isCharge ? '＋' : '🏷'} ${label}</span>
        <span style="font-weight:800; color:${color};">${sign}$${formatMoney(adj.amount)}</span>
      </div>`;
    })
    .join('');

  const adjustmentsBlock =
    adjustments.length > 0
      ? `<div style="border:1px solid #cdd9cc; border-radius:10px; background:#fff; padding:8px 12px; margin-bottom:10px;">
          <div style="font-size:10px; font-weight:900; letter-spacing:0.09em; text-transform:uppercase; color:#7a9977; margin-bottom:5px;">Adjustments</div>
          ${adjustmentRowsHtml}
        </div>`
      : '';

  // Subtotals section (only render when there's something to break down)
  const hasBreakdown =
    (hasLineItems && (adjustmentCharges > 0 || adjustmentDiscounts > 0)) ||
    (showTip && displayedTip > 0);

  const subtotalsBlock = hasBreakdown
    ? `<div style="padding:8px 2px 2px; margin-top:2px; border-top:1.5px dashed #ddd3c8; margin-bottom:8px; display:grid; gap:3px;">
        ${hasLineItems ? `<div style="display:flex; justify-content:space-between; font-size:12px; color:#8a786a;"><span>Services</span><span style="font-weight:700;">$${formatMoney(baseSubtotal)}</span></div>` : ''}
        ${adjustmentCharges > 0 ? `<div style="display:flex; justify-content:space-between; font-size:12px; color:#5a8f56;"><span>Charges</span><span style="font-weight:700;">+$${formatMoney(adjustmentCharges)}</span></div>` : ''}
        ${adjustmentDiscounts > 0 ? `<div style="display:flex; justify-content:space-between; font-size:12px; color:#c0603a;"><span>Discounts</span><span style="font-weight:700;">−$${formatMoney(adjustmentDiscounts)}</span></div>` : ''}
        ${showTip && displayedTip > 0 ? `<div style="display:flex; justify-content:space-between; font-size:12px; color:#8a786a;"><span>Tip 💝</span><span style="font-weight:700;">$${formatMoney(displayedTip)}</span></div>` : ''}
      </div>`
    : '';

  // Payment block
  const paymentBlock = [
    renderPaymentBlock(paymentInstructions),
    paymentNotes
      ? `<div style="margin-top:8px; font-size:11px; color:#7a6657; line-height:1.5; padding:0 4px;"><strong>Note:</strong> ${paymentNotes}</div>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  return `
    <section style="font-family: Nunito, 'Trebuchet MS', sans-serif; color: #3a2e24; border-radius: 16px; overflow: hidden; border: 1px solid #b8d0b5; box-shadow: 0 4px 20px rgba(80,130,70,0.1);">

      <!-- Green gradient header -->
      <div style="background: linear-gradient(135deg, #4a7544 0%, #6a9e65 55%, #8FB886 100%); padding: 16px 16px 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">

          <!-- Dog avatar -->
          <div style="position: relative; flex-shrink: 0;">
            <div style="width: 58px; height: 58px; border-radius: 50%; border: 2.5px solid rgba(255,255,255,0.7); overflow: hidden; background: linear-gradient(135deg, #d4edd1, #a8ccaa); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${dogAvatarInnerHtml}
            </div>
            <div style="position: absolute; bottom: -1px; right: -2px; width: 20px; height: 20px; background: rgba(255,255,255,0.95); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">🐾</div>
          </div>

          <!-- Dog + client names -->
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.6); margin-bottom: 4px;">${documentLabel}</div>
            <div style="font-size: 17px; font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dogName}</div>
            <div style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.82); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${clientName}</div>
          </div>

          <!-- Logo / sitter + paid badge -->
          <div style="flex-shrink: 0; text-align: right;">
            ${headerRightHtml}
            ${paidBadgeHtml}
          </div>
        </div>

        <!-- Date strip -->
        <div style="margin-top: 12px; background: rgba(255,255,255,0.18); border-radius: 8px; padding: 7px 11px; display: flex; align-items: center; gap: 7px;">
          <span style="font-size: 12px; line-height: 1;">📅</span>
          <span style="font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.95);">${dateDisplay}</span>
        </div>
      </div>

      <!-- Body -->
      <div style="background: #fdfbf7; padding: 14px 14px 10px;">

        ${lineItemsBlock}
        ${adjustmentsBlock}
        ${subtotalsBlock}

        <!-- Total box -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: linear-gradient(135deg, #fef0ea, #fdfbf7); border-radius: 12px; border: 1px solid #e8c9b8;">
          <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #a87060;">Total Due</div>
          <div style="font-size: 30px; font-weight: 900; letter-spacing: -0.025em; color: #D4845A; line-height: 1;">$${formatMoney(displayedTotal)}</div>
        </div>

        ${paymentBlock}

        <!-- Footer -->
        <div style="text-align: center; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #e2d8ce;">
          <span style="font-size: 11px; color: #b8a898; font-weight: 700; letter-spacing: 0.04em;">Thank you for trusting us with ${dogName} 🐾</span>
        </div>
      </div>
    </section>
  `;
}

import { describe, expect, it } from 'vitest';
import { buildInvoiceHtml } from '@/lib/invoiceTemplate';
import {
  calculateInvoiceTotals,
  generateInvoiceMarkdown,
  parseInvoiceOverrides,
} from '@/lib/invoiceGenerator';

describe('invoiceTemplate', () => {
  it('escapes user-provided fields in generated HTML', () => {
    const payload = '<script>alert("x")</script>&\'"';

    const html = buildInvoiceHtml({
      sitterName: payload,
      clientName: payload,
      dogName: payload,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 100,
      tipAmount: 20,
      paymentInstructions: payload,
      paymentNotes: payload,
      logoUrl: payload,
    });

    const escapedPayload = '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;&quot;';

    expect(html).not.toContain(payload);
    expect(html).toContain(
      `<p style="margin:4px 0 0; font-size:12px; color:#7a6657; font-weight:700;">${escapedPayload}</p>`,
    );
    expect(html).toContain(`<p style="margin:0; color:#7a6657;">Client</p>`);
    expect(html).toContain(
      `<p style="margin:0; font-weight:800; color:#4A3728;">${escapedPayload}</p>`,
    );
    expect(html).toContain(`<p style="margin:0; color:#7a6657;">Dog</p>`);
    expect(html).toContain(`<strong>Payment instructions:</strong> ${escapedPayload}`);
    expect(html).toContain(`<strong>Notes:</strong> ${escapedPayload}`);
    expect(html).toContain(
      `<img src="${escapedPayload}" alt="Business logo" style="height:48px; width:48px; object-fit:cover; border-radius:8px;" />`,
    );
  });

  it('keeps credit, subtotal, and total aligned with receipt preview totals', () => {
    const input = {
      sitterName: 'Sitter',
      clientName: 'Client',
      dogName: 'Dog',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 120,
      creditAmount: 20,
      tipAmount: 15,
      documentLabel: 'Receipt' as const,
      isPaid: true,
    };

    const html = buildInvoiceHtml(input);
    const markdown = generateInvoiceMarkdown(input);

    expect(html).toContain('Subtotal');
    expect(html).toContain('$100.00');
    expect(html).toContain('$115.00');
    expect(markdown).toContain('Subtotal: $100.00');
    expect(markdown).toContain('Total: $115.00');
  });

  it('clamps credit to prevent negative subtotal and total', () => {
    const input = {
      sitterName: 'Sitter',
      clientName: 'Client',
      dogName: 'Dog',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 80,
      creditAmount: 500,
      tipAmount: 0,
    };

    const html = buildInvoiceHtml(input);
    const markdown = generateInvoiceMarkdown(input);
    const totals = calculateInvoiceTotals(input);

    expect(totals.credit).toBe(80);
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(0);
    expect(html).toContain('Subtotal');
    expect(html).toContain('$0.00');
    expect(markdown).toContain('Subtotal: $0.00');
    expect(markdown).toContain('Total: $0.00');
  });

  it('renders Receipt label when documentLabel is provided', () => {
    const html = buildInvoiceHtml({
      sitterName: 'Sitter',
      clientName: 'Client',
      dogName: 'Dog',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 100,
      documentLabel: 'Receipt',
      isPaid: true,
    });

    expect(html).toContain('>Receipt</h1>');
    expect(html).toContain('>Paid</p>');
  });

  it('does not render tip row for invoice document preview', () => {
    const html = buildInvoiceHtml({
      sitterName: 'Sitter',
      clientName: 'Client',
      dogName: 'Dog',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 100,
      tipAmount: 20,
      documentLabel: 'Invoice',
    });

    expect(html).not.toContain('<p>Tip:');
  });

  it('renders tip row for receipt document preview', () => {
    const html = buildInvoiceHtml({
      sitterName: 'Sitter',
      clientName: 'Client',
      dogName: 'Dog',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 100,
      tipAmount: 20,
      documentLabel: 'Receipt',
      isPaid: true,
    });

    expect(html).toContain('Tip');
    expect(html).toContain('$20.00');
  });
});

describe('parseInvoiceOverrides', () => {
  it('returns sanitized invoice overrides from valid input', () => {
    const parsed = parseInvoiceOverrides({
      lineItems: [{ type: 'boarding', isHoliday: false, count: 2, rate: 45 }],
      creditAmount: 10,
    });

    expect(parsed).toEqual({
      lineItems: [{ type: 'boarding', isHoliday: false, count: 2, rate: 45 }],
      creditAmount: 10,
      adjustments: [{ id: 'legacy-credit', kind: 'discount', description: '', amount: 10 }],
    });
  });

  it('parses valid adjustments when provided', () => {
    const parsed = parseInvoiceOverrides({
      lineItems: [{ type: 'boarding', isHoliday: false, count: 2, rate: 45 }],
      adjustments: [
        { id: 'adj-1', kind: 'discount', description: 'Loyalty', amount: 5 },
        { id: 'adj-2', kind: 'charge', description: 'Holiday surcharge', amount: 12 },
      ],
    });

    expect(parsed).toEqual({
      lineItems: [{ type: 'boarding', isHoliday: false, count: 2, rate: 45 }],
      creditAmount: 5,
      adjustments: [
        { id: 'adj-1', kind: 'discount', description: 'Loyalty', amount: 5 },
        { id: 'adj-2', kind: 'charge', description: 'Holiday surcharge', amount: 12 },
      ],
    });
  });

  it('maps legacy creditAmount to a single discount adjustment when adjustments are absent', () => {
    const parsed = parseInvoiceOverrides({
      lineItems: [{ type: 'boarding', isHoliday: false, count: 1, rate: 80 }],
      creditAmount: 10,
    });

    expect(parsed).toEqual({
      lineItems: [{ type: 'boarding', isHoliday: false, count: 1, rate: 80 }],
      creditAmount: 10,
      adjustments: [{ id: 'legacy-credit', kind: 'discount', description: '', amount: 10 }],
    });
  });

  it('returns null for invalid invoice overrides payloads', () => {
    expect(parseInvoiceOverrides(null)).toBeNull();
    expect(parseInvoiceOverrides('bad')).toBeNull();
    expect(
      parseInvoiceOverrides({
        lineItems: [{ type: 'other', isHoliday: false, count: 2, rate: 45 }],
        creditAmount: 10,
      }),
    ).toBeNull();

    expect(
      parseInvoiceOverrides({
        lineItems: [{ type: 'boarding', isHoliday: false, count: 2, rate: 45 }],
        adjustments: [{ id: 'adj-1', kind: 'rebate', description: 'Bad', amount: 4 }],
      }),
    ).toBeNull();

    expect(
      parseInvoiceOverrides({
        lineItems: [{ type: 'boarding', isHoliday: false, count: 2, rate: 45 }],
        adjustments: [{ id: 'adj-1', kind: 'discount', description: 'Bad', amount: -4 }],
      }),
    ).toBeNull();
  });
});

describe('calculateInvoiceTotals adjustments', () => {
  it('computes subtotal as base subtotal plus charges minus discounts', () => {
    const totals = calculateInvoiceTotals({
      sitterName: 'Sitter',
      clientName: 'Client',
      dogName: 'Dog',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 100,
      adjustments: [
        { id: 'adj-1', kind: 'charge', description: 'After hours', amount: 15 },
        { id: 'adj-2', kind: 'discount', description: 'Promo', amount: 20 },
      ],
    });

    expect(totals.baseSubtotal).toBe(100);
    expect(totals.adjustmentCharges).toBe(15);
    expect(totals.adjustmentDiscounts).toBe(20);
    expect(totals.adjustmentNet).toBe(-5);
    expect(totals.subtotal).toBe(95);
    expect(totals.total).toBe(95);
  });
});

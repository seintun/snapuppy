import { describe, expect, it } from 'vitest';
import { buildInvoiceHtml } from '@/lib/invoiceTemplate';
import { calculateInvoiceTotals, generateInvoiceMarkdown, parseInvoiceOverrides } from '@/lib/invoiceGenerator';

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
    expect(html).toContain(`<p style="margin:4px 0 0;">${escapedPayload}</p>`);
    expect(html).toContain(`<p>Client: ${escapedPayload}</p>`);
    expect(html).toContain(`<p>Dog: ${escapedPayload}</p>`);
    expect(html).toContain(`<p>Payment instructions: ${escapedPayload}</p>`);
    expect(html).toContain(`<p>Notes: ${escapedPayload}</p>`);
    expect(html).toContain(`<img src="${escapedPayload}" alt="Business logo" style="height:48px; width:48px; object-fit:cover; border-radius:8px;" />`);
  });

  it('keeps credit, subtotal, and total aligned with markdown invoice generation', () => {
    const input = {
      sitterName: 'Sitter',
      clientName: 'Client',
      dogName: 'Dog',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      subtotal: 120,
      creditAmount: 20,
      tipAmount: 15,
    };

    const html = buildInvoiceHtml(input);
    const markdown = generateInvoiceMarkdown(input);

    expect(html).toContain('<p>Subtotal: $100.00</p>');
    expect(html).toContain('<p><strong>Total: $115.00</strong></p>');
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
    expect(html).toContain('<p>Subtotal: $0.00</p>');
    expect(html).toContain('<p><strong>Total: $0.00</strong></p>');
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

    expect(html).toContain('<h1 style="margin:0; font-size:20px;">Receipt</h1>');
    expect(html).toContain('<p style="margin:4px 0 0; font-weight:700; color:#2E7D32;">PAID</p>');
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
  });
});

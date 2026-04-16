import { describe, expect, it } from 'vitest';
import { buildInvoiceHtml } from '@/lib/invoiceTemplate';

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
});

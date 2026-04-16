import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoicePreview } from '@/features/invoice/InvoicePreview';

describe('InvoicePreview actions', () => {
  it('shows only download action without print or share link', () => {
    render(
      <InvoicePreview
        invoice={{
          sitterName: 'Snapuppy Sitter',
          clientName: 'Client',
          dogName: 'Dog',
          startDate: '2026-01-01',
          endDate: '2026-01-02',
          subtotal: 100,
          documentLabel: 'Invoice',
          isPaid: false,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /download png/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /print/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open share link/i })).not.toBeInTheDocument();
  });
});

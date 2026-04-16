import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateInvoiceSheet } from '@/features/invoice/GenerateInvoiceSheet';
import type { InvoiceLineItem, InvoiceOverrides } from '@/lib/invoiceGenerator';

const { saveInvoiceOverridesMock } = vi.hoisted(() => ({
  saveInvoiceOverridesMock: vi.fn(),
}));

vi.mock('@/components/ui/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/hooks/useBookings', () => ({
  useSaveInvoiceOverrides: () => ({
    mutateAsync: saveInvoiceOverridesMock,
    isPending: false,
  }),
}));

const baseLineItems: InvoiceLineItem[] = [
  {
    type: 'boarding',
    isHoliday: false,
    count: 2,
    rate: 75,
  },
];

const baseSavedOverrides: InvoiceOverrides | null = null;

function renderSheet() {
  return render(
    <GenerateInvoiceSheet
      isOpen
      onClose={vi.fn()}
      bookingId="booking-1"
      initialLineItems={baseLineItems}
      savedOverrides={baseSavedOverrides}
      previewInvoice={{
        sitterName: 'Snapuppy Sitter',
        clientName: 'Nina',
        dogName: 'Ice',
        startDate: '2026-04-16',
        endDate: '2026-04-18',
        subtotal: 150,
        tipAmount: 0,
        paymentNotes: null,
        isPaid: false,
      }}
    />,
  );
}

describe('GenerateInvoiceSheet', () => {
  beforeEach(() => {
    saveInvoiceOverridesMock.mockReset();
    saveInvoiceOverridesMock.mockResolvedValue(undefined);
  });

  it('stays in sheet after save and shows preview actions', async () => {
    renderSheet();

    fireEvent.click(screen.getByRole('button', { name: /save & preview/i, hidden: true }));

    await waitFor(() => {
      expect(saveInvoiceOverridesMock).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        overrides: expect.objectContaining({
          lineItems: expect.any(Array),
          adjustments: expect.any(Array),
        }),
      });
    });
    expect(
      await screen.findByRole('dialog', { name: /invoice preview/i, hidden: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download png/i, hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to edit/i, hidden: true })).toBeInTheDocument();
  });

  it('allows adding adjustment rows and requires charge descriptions', async () => {
    renderSheet();

    fireEvent.click(screen.getByRole('button', { name: /add charge/i, hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: /save & preview/i, hidden: true }));

    expect(await screen.findByText(/charge description is required/i)).toBeInTheDocument();
    expect(saveInvoiceOverridesMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/charge description/i), {
      target: { value: 'Late pickup fee' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save & preview/i, hidden: true }));

    await waitFor(() => {
      expect(saveInvoiceOverridesMock).toHaveBeenCalledTimes(1);
    });
  });
});

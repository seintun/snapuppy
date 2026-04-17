/**
 * Shared helpers for building invoice/receipt preview props from booking data.
 * Colocated here (not in lib/) because it depends on app-level types.
 */

import type { InvoiceInput } from '@/lib/invoiceGenerator';
import type { BookingRecord } from '@/lib/bookingService';
import type { Tables } from '@/types/database';

type ProfileRow = Tables<'profiles'>;

export type InvoicePreviewInput = InvoiceInput & {
  logoUrl?: string | null;
  paymentInstructions?: string | null;
  documentLabel?: 'Invoice' | 'Receipt';
  isPaid?: boolean;
};

/**
 * Assembles the invoice preview input from a booking record and the sitter's
 * profile. Both `BookingDetailScreen` and `BookingReceiptView` use this.
 *
 * @param booking - Fully-fetched booking with dog relation.
 * @param profile - Sitter profile (may be undefined while loading).
 * @param overrides - Optional partial overrides (e.g. tipAmount, documentLabel, isPaid).
 */
export function buildBookingInvoiceInput(
  booking: BookingRecord,
  profile: ProfileRow | null | undefined,
  overrides?: Partial<InvoicePreviewInput>,
): InvoicePreviewInput {
  return {
    sitterName: profile?.display_name ?? 'Sitter',
    clientName: booking.dog?.owner_name ?? 'Client',
    dogName: booking.dog?.name ?? 'Dog',
    dogPhotoUrl: booking.dog?.photo_url ?? null,
    startDate: booking.start_date,
    endDate: booking.end_date,
    subtotal: booking.total_amount,
    tipAmount: booking.tip_amount ?? 0,
    paymentInstructions: profile?.payment_instructions ?? null,
    paymentNotes: booking.payment_notes,
    isPaid: booking.is_paid ?? false,
    ...overrides,
  };
}

import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Warning } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/useToast';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Badge } from '@/components/ui/Badge';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import {
  useBooking,
  useCheckInBooking,
  useCheckOutBooking,
  useUpdateBookingStatus,
} from '@/hooks/useBookings';
import { useQueryClient } from '@tanstack/react-query';
import { ReportList } from '@/features/reports';
import { GenerateInvoiceSheet } from '@/features/invoice/GenerateInvoiceSheet';
import { parseInvoiceOverrides, type InvoiceLineItem } from '@/lib/invoiceGenerator';
import { useProfile } from '@/hooks/useProfile';
import { getStatusLabel, getStatusVariant } from './bookingUi';
import { BookingTypePill } from './BookingTypePill';
import { CloseBookingSheet } from './CloseBookingSheet';

export function BookingDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, isError, error: queryError } = useBooking(id);
  const { data: profile } = useProfile();
  const { mutateAsync: updateBookingStatusMutation } = useUpdateBookingStatus();
  const { mutateAsync: checkInBooking } = useCheckInBooking();
  const { mutateAsync: checkOutBooking } = useCheckOutBooking();

  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [closeSheetOpen, setCloseSheetOpen] = useState(false);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCancel = useCallback(async () => {
    if (!booking) return;
    setSaving(true);
    try {
      await updateBookingStatusMutation({ id: booking.id, status: 'cancelled' });
      await queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      addToast('Booking cancelled', 'info');
      navigate('/bookings');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to cancel booking', 'error');
    } finally {
      setSaving(false);
      setCancelConfirm(false);
    }
  }, [booking, navigate, addToast, updateBookingStatusMutation, queryClient]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <AppLoadingAnimation size="md" label="Loading booking..." />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="p-6 text-center text-terracotta">
        <Warning size={40} className="mb-2 inline-block" />
        <p>{queryError instanceof Error ? queryError.message : 'Booking not found'}</p>
        <button className="btn-sage mt-4" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const dog = booking.dog;
  const derivedLineItems = Object.values(
    booking.days.reduce(
      (acc, day) => {
        const key = `${day.rate_type}-${day.is_holiday}-${day.amount}`;
        if (!acc[key]) {
          acc[key] = {
            type: day.rate_type,
            isHoliday: day.is_holiday,
            count: 0,
            rate: day.amount,
          };
        }
        acc[key].count += 1;
        return acc;
      },
      {} as Record<string, InvoiceLineItem>,
    ),
  );

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-cream px-4 pt-2 pb-4 border-b border-pebble/60 shadow-[0_2px_8px_rgba(74,55,40,0.04)]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-bark-light hover:text-bark font-semibold text-sm bg-transparent border-none cursor-pointer py-1 mb-3 transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          Back
        </button>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {dog ? (
              <DogAvatar name={dog.name} src={dog.photo_url} size="md" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center text-xl">
                🐾
              </div>
            )}

            <div className="min-w-0">
              <h1 className="m-0 text-[30px] font-black text-bark tracking-tight leading-none truncate">
                {dog?.name ?? 'Unknown Dog'}
              </h1>
              <div className="mt-1.5 text-xs text-bark-light font-semibold tracking-[0.01em] whitespace-nowrap truncate">
                {format(parseISO(booking.start_date), 'MMM d')} -{' '}
                {format(parseISO(booking.end_date), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge
              variant={getStatusVariant(booking.status)}
              className="text-[10px] px-2 py-0.5 uppercase tracking-[0.08em]"
            >
              {getStatusLabel(booking.status)}
            </Badge>
            <BookingTypePill type={booking.type} isHoliday={booking.is_holiday} />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {/* Reservation Summary */}
        <div className="bg-cream rounded-[14px] shadow-[0_2px_8px_rgba(74,55,40,0.08)] overflow-hidden">
          <div className="p-4 bg-[linear-gradient(to_bottom,var(--color-sage-light)_0%,transparent_150%)]">
            <div className="text-[10px] font-bold text-bark-light uppercase tracking-wider mb-3">
              Invoice Breakdown
            </div>
            <div className="flex flex-col gap-3">
              {derivedLineItems.map((item) => {
                const itemTotal = item.count * item.rate;
                return (
                  <div
                    key={`${item.type}-${item.isHoliday}-${item.rate}`}
                    className="flex justify-between items-center text-[13px] text-bark"
                  >
                    <div className="flex items-center flex-wrap gap-x-2">
                      <span className="font-bold capitalize">{item.type}</span>
                      {item.isHoliday && (
                        <span className="text-[10px] font-black text-terracotta uppercase bg-white/60 border border-terracotta/20 px-1.5 py-[1px] rounded-md drop-shadow-sm">
                          Holiday
                        </span>
                      )}
                      <span className="text-bark-light font-medium ml-1">
                        × {item.count}{' '}
                        {item.type === 'boarding' ? (item.count === 1 ? 'night' : 'nights') : 'day'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[14px]">${itemTotal.toFixed(2)}</div>
                      <div className="text-[10px] text-bark-light font-medium mt-0.5">
                        ${item.rate.toFixed(2)}/each
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-end mt-4 pt-4 border-t border-pebble/50">
              <span className="font-bold text-bark text-sm pb-1">Total</span>
              <span className="text-[28px] leading-none font-black text-terracotta tracking-tight">
                ${booking.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {booking.status !== 'cancelled' && (
          <div className="mt-2">
            {cancelConfirm ? (
              <div className="bg-blush rounded-[14px] p-4 border-[1.5px] border-terracotta">
                <p className="m-0 mb-3 font-bold text-terracotta text-sm">
                  Cancel this booking? This cannot be undone.
                </p>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => void handleCancel()}
                    disabled={saving}
                    className="flex-1 min-h-[44px] bg-terracotta text-white border-none rounded-lg font-bold text-sm cursor-pointer"
                  >
                    {saving ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="flex-1 min-h-[44px] bg-cream text-bark border-[1.5px] border-pebble rounded-lg font-bold text-sm cursor-pointer"
                  >
                    Keep booking
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCancelConfirm(true)}
                className="w-full min-h-[48px] bg-transparent text-terracotta border-[1.5px] border-terracotta rounded-[14px] font-bold text-sm cursor-pointer"
              >
                Cancel booking
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-2">
          {booking.status === 'upcoming' ? (
            <button
              type="button"
              className="btn-sage"
              onClick={() =>
                void checkInBooking(booking.id).then(() => {
                  addToast('Checked in', 'success');
                })
              }
            >
              Check In
            </button>
          ) : null}

          {booking.status === 'active' ? (
            <button
              type="button"
              className="btn-danger"
              onClick={() =>
                void checkOutBooking(booking.id).then(() => {
                  addToast('Checked out', 'success');
                })
              }
            >
              Check Out
            </button>
          ) : null}

          {booking.status === 'awaiting' ? (
            <button
              type="button"
              className="btn-danger whitespace-nowrap text-[15px] tracking-tight"
              onClick={() => setCloseSheetOpen(true)}
            >
              Mark as Paid
            </button>
          ) : null}

          {booking.status === 'awaiting' || booking.status === 'paid' ? (
            <button
              type="button"
              className="btn-sage whitespace-nowrap text-[15px] tracking-tight"
              onClick={() => setGenerateSheetOpen(true)}
            >
              Generate Invoice
            </button>
          ) : null}

          {booking.status === 'paid' ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/receipt/${booking.id}`)}
            >
              View Receipt
            </button>
          ) : null}
        </div>

        <div className="mt-3">
          <h2 className="text-sm font-black text-bark mb-2 uppercase tracking-wide">
            Daily Reports
          </h2>
          <ReportList bookingId={booking.id} />
        </div>
      </div>
      <CloseBookingSheet
        isOpen={closeSheetOpen}
        onClose={() => setCloseSheetOpen(false)}
        bookingId={booking.id}
      />
      <GenerateInvoiceSheet
        isOpen={generateSheetOpen}
        onClose={() => setGenerateSheetOpen(false)}
        bookingId={booking.id}
        initialLineItems={derivedLineItems}
        savedOverrides={parseInvoiceOverrides(booking.invoice_overrides)}
        previewInvoice={{
          sitterName: profile?.display_name || 'Sitter',
          clientName: booking.dog?.owner_name ?? 'Client',
          dogName: booking.dog?.name ?? 'Dog',
          dogPhotoUrl: booking.dog?.photo_url ?? null,
          startDate: booking.start_date,
          endDate: booking.end_date,
          subtotal: booking.total_amount,
          tipAmount: 0,
          paymentInstructions: profile?.payment_instructions ?? null,
          paymentNotes: booking.payment_notes,
          isPaid: booking.is_paid ?? false,
        }}
      />
    </div>
  );
}

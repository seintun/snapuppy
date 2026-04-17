import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Warning, CurrencyCircleDollar, CheckSquare, Receipt } from '@phosphor-icons/react';
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
import { buildBookingInvoiceInput } from '@/features/invoice/invoiceHelpers';
import { getStatusLabel, getStatusVariant, formatTime } from './bookingUi';
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
      <div className="bg-cream px-4 pt-2 pb-5 border-b border-pebble/60 shadow-sm relative z-20">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-bark-light hover:text-bark font-bold text-[11px] uppercase tracking-wider bg-transparent border-none cursor-pointer py-1 transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Badge
              variant={getStatusVariant(booking.status)}
              className="text-[9px] px-2 py-0.5 uppercase tracking-widest font-black"
            >
              {getStatusLabel(booking.status)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {dog ? (
            <DogAvatar name={dog.name} src={dog.photo_url} size="lg" className="ring-2 ring-pebble ring-offset-2 ring-offset-cream" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center text-2xl">
              🐾
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-0.5 min-w-0">
              <h1 className="m-0 text-[32px] font-black text-bark tracking-tight leading-none truncate">
                {dog?.name ?? 'Unknown Dog'}
              </h1>
              <div className="shrink-0 translate-y-0.5">
                <BookingTypePill type={booking.type} isHoliday={booking.is_holiday} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[13px] text-bark-light font-bold flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {format(parseISO(booking.start_date), 'MMM d')} -{' '}
                  {format(parseISO(booking.end_date), 'MMM d, yyyy')}
                </div>
                {(booking.dropoff_time || booking.pickup_time) && (
                  <div className="text-[11px] font-black uppercase tracking-wider flex items-center gap-3">
                    {booking.dropoff_time && (
                      <span className="flex items-center gap-1 text-sage">
                        <span className="opacity-50 text-[9px] font-bold">In:</span> {formatTime(booking.dropoff_time)}
                      </span>
                    )}
                    {booking.pickup_time && (
                      <span className="flex items-center gap-1 text-terracotta">
                        <span className="opacity-50 text-[9px] font-bold">Out:</span> {formatTime(booking.pickup_time)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Invoice Summary */}
        <div className="surface-card !p-0 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-4">
              <CurrencyCircleDollar size={14} weight="bold" className="text-sage" />
              <span className="text-[11px] font-extrabold text-bark-light uppercase tracking-widest">
                Invoice Breakdown
              </span>
            </div>

            <div className="flex flex-col gap-3.5">
              {derivedLineItems.map((item) => {
                const itemTotal = item.count * item.rate;
                return (
                  <div
                    key={`${item.type}-${item.isHoliday}-${item.rate}`}
                    className="flex justify-between items-start"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-bark capitalize">{item.type}</span>
                        {item.isHoliday && (
                          <span className="text-[9px] font-black text-white bg-terracotta px-1.5 py-[1px] rounded uppercase tracking-wider">
                            Holiday
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-bark-light font-medium">
                        {item.count}{' '}
                        {item.type === 'boarding' ? (item.count === 1 ? 'night' : 'nights') : (item.count === 1 ? 'day' : 'days')}
                        {' '}@ ${item.rate.toFixed(0)}
                      </span>
                    </div>
                    <div className="text-sm font-black text-bark pt-0.5">${itemTotal.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-5 pt-4 border-t border-pebble/60">
              <span className="text-xs font-bold text-bark-light uppercase tracking-widest">Total Amount</span>
              <span className="text-[26px] font-black text-bark tracking-tight leading-none">
                ${booking.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col gap-2.5 mt-2">
          {booking.status === 'upcoming' && (
            <button
              type="button"
              className="btn-sage w-full min-h-[54px] text-[17px] shadow-lg shadow-sage/20"
              onClick={() =>
                void checkInBooking(booking.id).then(() => {
                  addToast('Checked in', 'success');
                })
              }
            >
              Check In {dog?.name}
            </button>
          )}

          {booking.status === 'active' && (
            <button
              type="button"
              className="btn-danger w-full min-h-[54px] text-[17px] shadow-lg shadow-terracotta/20"
              onClick={() =>
                void checkOutBooking(booking.id).then(() => {
                  addToast('Checked out', 'success');
                })
              }
            >
              Check Out
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {booking.status === 'awaiting' && (
              <button
                type="button"
                className="btn-danger text-[15px] font-bold py-3 flex items-center justify-center gap-2"
                onClick={() => setCloseSheetOpen(true)}
              >
                <CheckSquare size={18} weight="bold" />
                Mark Paid
              </button>
            )}

            {(booking.status === 'awaiting' || booking.status === 'paid') && (
              <button
                type="button"
                className={`btn-sage text-[15px] font-bold py-3 flex items-center justify-center gap-2 ${booking.status === 'paid' ? 'col-span-1' : 'col-span-1'}`}
                onClick={() => setGenerateSheetOpen(true)}
              >
                <Receipt size={18} weight="bold" />
                {booking.status === 'paid' ? 'Invoice' : 'Invoice'}
              </button>
            )}

            {booking.status === 'paid' && (
              <button
                type="button"
                className="btn-secondary text-[15px] py-3 font-bold"
                onClick={() => navigate(`/receipt/${booking.id}`)}
              >
                View Receipt
              </button>
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black text-bark-light uppercase tracking-widest">
              Daily Reports
            </h2>
          </div>
          <ReportList bookingId={booking.id} />
        </div>

        {/* Danger Zone - Discreet Cancellation */}
        {booking.status !== 'cancelled' && booking.status !== 'paid' && (
          <div className="mt-12 pt-8 border-t border-pebble/40 flex flex-col items-center">
            {cancelConfirm ? (
              <div className="surface-card !bg-blush/10 !p-5 border border-terracotta/20 w-full animate-in fade-in zoom-in duration-200">
                <p className="m-0 mb-4 font-bold text-terracotta text-sm text-center leading-snug">
                  Cancel this booking? <br/>This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => void handleCancel()}
                    disabled={saving}
                    className="flex-1 py-3 bg-terracotta text-white border-none rounded-xl font-bold text-sm cursor-pointer active:scale-95 transition-transform shadow-md shadow-terracotta/20"
                  >
                    {saving ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="flex-1 py-3 bg-cream text-bark border border-pebble rounded-xl font-bold text-sm cursor-pointer active:scale-95 transition-transform"
                  >
                    Keep booking
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCancelConfirm(true)}
                className="text-[10px] font-black text-terracotta/60 uppercase tracking-[0.15em] hover:text-terracotta hover:scale-105 active:scale-95 transition-all py-4 px-8"
              >
                Cancel booking
              </button>
            )}
          </div>
        )}


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
        previewInvoice={buildBookingInvoiceInput(booking, profile, {
          tipAmount: 0,
        })}
      />
    </div>
  );
}

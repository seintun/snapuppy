import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, SignIn, SignOut, CurrencyDollar } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddButton } from '@/components/ui/AddButton';
import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { Badge } from '@/components/ui/Badge';
import {
  useAutoAdvanceBookings,
  useBookings,
  useCheckInBooking,
  useCheckOutBooking,
} from '@/hooks/useBookings';
import { type BookingRecord, type BookingStatus } from '@/lib/bookingService';
import { CreateBookingSheet } from './CreateBookingSheet';
import { MarkPaidSheet } from './MarkPaidSheet';
import { calculateInvoiceTotals } from '@/lib/invoiceGenerator';
import { useProfile } from '@/hooks/useProfile';
import { BookingTypePill } from './BookingTypePill';
import {
  bookingStatusOptions,
  formatBookingRange,
  formatCurrency,
  getStatusLabel,
  getStatusVariant,
  getDurationText,
  formatTime,
} from './bookingUi';

const TABS: BookingStatus[] = bookingStatusOptions;

function getBorderColor(status: BookingStatus): string {
  if (status === 'upcoming') return 'border-amber';
  if (status === 'active') return 'border-sky';
  if (status === 'awaiting') return 'border-terracotta';
  return 'border-sage';
}

function sortBookingsByTab(bookings: BookingRecord[], tab: BookingStatus): BookingRecord[] {
  return [...bookings].sort((left, right) => {
    if (tab === 'paid') {
      const leftDate = new Date(left.paid_at ?? left.updated_at).getTime();
      const rightDate = new Date(right.paid_at ?? right.updated_at).getTime();
      return rightDate - leftDate;
    }

    if (tab === 'awaiting') {
      return left.end_date.localeCompare(right.end_date);
    }

    return left.start_date.localeCompare(right.start_date);
  });
}

export function BookingsScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  useAutoAdvanceBookings();
  const { data: bookings = [], isLoading, isError, error } = useBookings();
  const { mutateAsync: checkInBooking, isPending: checkingIn } = useCheckInBooking();
  const { mutateAsync: checkOutBooking, isPending: checkingOut } = useCheckOutBooking();
  const requestedTab = searchParams.get('tab');
  const defaultTab = requestedTab && TABS.includes(requestedTab as BookingStatus)
    ? (requestedTab as BookingStatus)
    : 'active';
  const [activeTab, setActiveTab] = useState<BookingStatus>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [markPaidBookingId, setMarkPaidBookingId] = useState<string | null>(null);
  const { data: profile } = useProfile();

  useEffect(() => {
    if (!requestedTab) return;
    if (!TABS.includes(requestedTab as BookingStatus)) return;
    setActiveTab(requestedTab as BookingStatus);
  }, [requestedTab]);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const query = searchQuery.toLowerCase();

    return bookings.filter(
      (booking) =>
        booking.dog?.name.toLowerCase().includes(query) ||
        booking.dog?.owner_name?.toLowerCase().includes(query),
    );
  }, [bookings, searchQuery]);

  const tabBookings = useMemo(
    () => sortBookingsByTab(filteredBySearch.filter((booking) => booking.status === activeTab), activeTab),
    [activeTab, filteredBySearch],
  );

  const cancelledBookings = useMemo(
    () =>
      sortBookingsByTab(
        filteredBySearch.filter((booking) => booking.status === 'cancelled'),
        'paid',
      ),
    [filteredBySearch],
  );

  const awaitingCount = bookings.filter((booking) => booking.status === 'awaiting').length;

  async function runPrimaryAction(booking: BookingRecord): Promise<void> {
    if (booking.status === 'upcoming') {
      await checkInBooking(booking.id);
      return;
    }

    if (booking.status === 'active') {
      await checkOutBooking(booking.id);
      return;
    }

    if (booking.status === 'awaiting') {
      setMarkPaidBookingId(booking.id);
    }
  }

  const ctaBusy = checkingIn || checkingOut;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <div className="sticky top-0 z-20 border-b border-pebble/10 bg-warm-beige/95 pb-3 pt-2 backdrop-blur-md">
        <div className="mb-4 flex flex-col gap-4">
          <div className="px-1 pt-2">
            <h1 className="text-3xl font-black leading-none tracking-tight text-bark">Bookings</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bark-light/40">
              {getStatusLabel(activeTab)} ({tabBookings.length})
            </p>
          </div>

          <div className="py-0.5">
            <div className="flex w-full rounded-full border border-pebble/5 bg-pebble/10 p-0.5 shadow-sm">
              {TABS.map((status) => {
                const isAwaiting = status === 'awaiting';
                const isActive = activeTab === status;

                return (
                  <button
                    key={status}
                    type="button"
                    className={`relative flex-1 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap rounded-full py-1.5 text-[10px] font-black transition-all ${
                      isActive ? 'bg-white text-sage shadow-md' : 'text-bark-light/50 hover:text-bark'
                    }`}
                    onClick={() => {
                      setActiveTab(status);
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        next.set('tab', status);
                        return next;
                      });
                    }}
                  >
                    {getStatusLabel(status)}
                    {isAwaiting && awaitingCount > 0 ? (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] leading-none text-white animate-pulse translate-y-[0.5px]">
                        {awaitingCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="group relative">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-light/20 transition-colors group-focus-within:text-sage"
            size={12}
            weight="bold"
          />
          <input
            type="text"
            placeholder="Search dog or owner..."
            className="form-input !rounded-full !bg-white/80 !py-1.5 !pl-8 !text-[10px] border-pebble/5 shadow-sm focus:ring-sage/20"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="scrollbar-none flex-1 overflow-y-auto pt-4">
        {isLoading && !bookings.length ? (
          <div className="flex h-[40vh] items-center justify-center">
            <AppLoadingAnimation size="md" label="Syncing bookings..." />
          </div>
        ) : null}

        {isError ? (
          <div className="p-6 text-center text-sm font-black text-terracotta">
            {error instanceof Error ? error.message : 'Sync failed'}
          </div>
        ) : null}

        {!isLoading && !isError ? (
          tabBookings.length ? (
            <div className="space-y-3 pb-20">
              {tabBookings.map((booking) => (
                <Card
                  key={booking.id}
                  className={`border border-pebble/10 p-0 shadow-sm ${getBorderColor(booking.status)} border-l-4 overflow-hidden relative active:scale-[0.98] transition-all cursor-pointer`}
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                >
                  <div className="flex items-center justify-between px-3 pt-2">
                    <BookingTypePill type={booking.type} isHoliday={booking.is_holiday} />
                    <Badge
                      variant={getStatusVariant(booking.status)}
                      className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-black"
                    >
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2.5 px-3 py-1.5">
                    <DogAvatar name={booking.dog?.name ?? 'Dog'} src={booking.dog?.photo_url} size="md" className="ring-1 ring-pebble/20" />
                    
                    <div className="flex-1 min-w-0">
                      <h2 className="truncate text-base font-black text-bark leading-none mb-0.5">
                        {booking.dog?.name ?? 'Unknown Dog'}
                      </h2>
                      <p className="text-[11px] font-bold tracking-wide text-bark-light mb-0.5">
                        {formatBookingRange(booking)}
                      </p>
                      {(booking.dropoff_time || booking.pickup_time) && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-black uppercase tracking-wider">
                          {booking.dropoff_time && (
                            <span className="flex items-center gap-1 whitespace-nowrap text-sage">
                              <span className="text-[8px] opacity-60">IN:</span> {formatTime(booking.dropoff_time)}
                            </span>
                          )}
                          {booking.pickup_time && (
                            <span className="flex items-center gap-1 whitespace-nowrap text-terracotta">
                              <span className="text-[8px] opacity-60">OUT:</span> {formatTime(booking.pickup_time)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <p className="text-xl font-black leading-none text-terracotta">
                        {(() => {
                          if (booking.status === 'paid' && (booking.total_amount ?? 0) > 0) {
                            return formatCurrency(booking.total_amount);
                          }
                          
                          const overrides = booking.invoice_overrides ? JSON.parse(JSON.stringify(booking.invoice_overrides)) : null;
                          const tipAmount = booking.tip_amount || 0;
                          
                          // If we have line item overrides, use them
                          if (overrides?.lineItems?.length > 0) {
                            const totals = calculateInvoiceTotals({
                              sitterName: '', clientName: '', dogName: '',
                              startDate: '2000-01-01', endDate: '2000-01-01',
                              subtotal: 0,
                              lineItems: overrides.lineItems,
                              adjustments: overrides.adjustments || [],
                              tipAmount
                            });
                            return formatCurrency(totals.total);
                          }
                          
                          // Fallback: derive from days
                          const subtotal = booking.days.reduce((sum, day) => sum + (day.amount || 0), 0);
                          return formatCurrency(subtotal + tipAmount);
                        })()}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-bark-light/40">
                        {getDurationText(booking)}
                      </p>
                    </div>
                  </div>

                  {booking.status !== 'paid' && (
                    <>
                      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-pebble/20 to-transparent opacity-50" />
                      <div className="px-3 py-1.5 flex justify-center">
                        <button
                          type="button"
                          className="btn-sage !w-auto !px-8 !py-1 !text-[10px] !rounded-full shadow-sm active:scale-95 transition-transform flex items-center gap-1.5"
                          onClick={(event) => {
                            event.stopPropagation();
                            void runPrimaryAction(booking);
                          }}
                          disabled={ctaBusy}
                        >
                        {booking.status === 'upcoming' ? (
                          <><SignIn size={12} weight="bold" />Check In</>
                        ) : booking.status === 'active' ? (
                          <><SignOut size={12} weight="bold" />Check Out</>
                        ) : (
                          <><CurrencyDollar size={12} weight="bold" />Mark Paid</>
                        )}
                      </button>
                    </div>
                  </>
                )}
                </Card>
              ))}

              {activeTab === 'paid' ? (
                <div className="pt-1">
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-xl border border-pebble/20 bg-cream/70 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-bark-light"
                    onClick={() => setShowCancelled((value) => !value)}
                  >
                    {showCancelled ? 'Hide Cancelled' : 'Show Cancelled'}
                  </button>

                  {showCancelled ? (
                    <div className="mt-2 space-y-2">
                      {cancelledBookings.length ? (
                        cancelledBookings.map((booking) => (
                          <Card
                            key={booking.id}
                            className="border border-pebble/10 border-l-4 border-l-pebble/40 p-3"
                            pressable
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-bark">
                                  {booking.dog?.name ?? 'Unknown Dog'}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-bark-light/60">
                                  {format(new Date(`${booking.start_date}T00:00:00`), 'MMM d')} -{' '}
                                  {format(new Date(`${booking.end_date}T00:00:00`), 'MMM d')}
                                </p>
                              </div>
                              <Badge variant="terracotta" className="text-[9px] uppercase">
                                Cancelled
                              </Badge>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="py-2 text-center text-xs font-bold text-bark-light/50">
                          No cancelled bookings.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title={searchQuery ? 'No matches found' : `No ${getStatusLabel(activeTab).toLowerCase()} bookings`}
                description={
                  searchQuery ? 'Try a different dog or owner name.' : 'Tap the + button to create a booking.'
                }
              />
            </div>
          )
        ) : null}
      </div>

      <CreateBookingSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      {markPaidBookingId ? (() => {
        const selectedBooking = bookings.find((b) => b.id === markPaidBookingId);
        return selectedBooking ? (
          <MarkPaidSheet
            isOpen={true}
            onClose={() => setMarkPaidBookingId(null)}
            booking={selectedBooking}
            profile={profile}
          />
        ) : null;
      })() : null}
      <AddButton onClick={() => setIsCreateOpen(true)} variant="booking" isActive={isCreateOpen} />
    </div>
  );
}

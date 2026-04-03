import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  createBooking as svcCreateBooking,
  deleteBooking as svcDeleteBooking,
  getBookingFormOptions,
  getBookings,
  saveBookingDays as svcSaveBookingDays,
  updateBookingStatus as svcUpdateBookingStatus,
  type BookingFormOptions,
  type BookingRecord,
  type BookingStatus,
  type CreateBookingInput,
  type EditableBookingDay,
} from '@/lib/bookingService';

interface UseBookingsResult {
  bookings: BookingRecord[];
  dogs: BookingFormOptions['dogs'];
  profile: BookingFormOptions['profile'];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createBooking: (input: Omit<CreateBookingInput, 'sitterId'>) => Promise<BookingRecord>;
  saveBookingDays: (bookingId: string, days: EditableBookingDay[]) => Promise<BookingRecord>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
}

interface BookingsSnapshot {
  key: string;
  bookings: BookingRecord[];
  dogs: BookingFormOptions['dogs'];
  profile: BookingFormOptions['profile'];
  error: string | null;
}

export function useBookings(): UseBookingsResult {
  const { user } = useAuthContext();
  const [snapshot, setSnapshot] = useState<BookingsSnapshot | null>(null);
  const [tick, setTick] = useState(0);
  const requestKey = user ? `${user.id}:${tick}` : null;

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!user || !requestKey) return;

    let cancelled = false;

    Promise.all([getBookings(user.id), getBookingFormOptions(user.id)])
      .then(([nextBookings, options]) => {
        if (cancelled) return;
        setSnapshot({
          key: requestKey,
          bookings: nextBookings,
          dogs: options.dogs,
          profile: options.profile,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSnapshot({
          key: requestKey,
          bookings: [],
          dogs: [],
          profile: null,
          error: err instanceof Error ? err.message : 'Failed to load bookings',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, user]);

  const createBooking = useCallback(
    async (input: Omit<CreateBookingInput, 'sitterId'>): Promise<BookingRecord> => {
      if (!user) throw new Error('You must be signed in to create bookings.');
      const booking = await svcCreateBooking({ ...input, sitterId: user.id });
      refresh();
      return booking;
    },
    [refresh, user],
  );

  const saveBookingDays = useCallback(
    async (bookingId: string, days: EditableBookingDay[]): Promise<BookingRecord> => {
      if (!user) throw new Error('You must be signed in to update bookings.');
      const booking = await svcSaveBookingDays({ bookingId, days, sitterId: user.id });
      refresh();
      return booking;
    },
    [refresh, user],
  );

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: BookingStatus): Promise<void> => {
      if (!user) throw new Error('You must be signed in to update bookings.');
      await svcUpdateBookingStatus(bookingId, user.id, status);
      refresh();
    },
    [refresh, user],
  );

  const deleteBooking = useCallback(
    async (bookingId: string): Promise<void> => {
      if (!user) throw new Error('You must be signed in to delete bookings.');
      await svcDeleteBooking(bookingId, user.id);
      refresh();
    },
    [refresh, user],
  );

  const activeSnapshot = requestKey && snapshot?.key === requestKey ? snapshot : null;

  return useMemo(
    () => ({
      bookings: activeSnapshot?.bookings ?? [],
      dogs: activeSnapshot?.dogs ?? [],
      profile: activeSnapshot?.profile ?? null,
      loading: Boolean(user && requestKey && !activeSnapshot),
      error: activeSnapshot?.error ?? null,
      refresh,
      createBooking,
      saveBookingDays,
      updateBookingStatus,
      deleteBooking,
    }),
    [
      activeSnapshot,
      refresh,
      createBooking,
      saveBookingDays,
      updateBookingStatus,
      deleteBooking,
      requestKey,
      user,
    ],
  );
}

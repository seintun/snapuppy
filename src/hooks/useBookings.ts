import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  createBooking as svcCreateBooking,
  deleteBooking as svcDeleteBooking,
  getBooking,
  getBookingFormOptions,
  getBookings,
  saveBookingDays as svcSaveBookingDays,
  updateBookingStatus as svcUpdateBookingStatus,
  type BookingRecord,
  type BookingStatus,
  type CreateBookingInput,
  type EditableBookingDay,
} from '@/lib/bookingService';
import { logger } from '@/lib/logger';

// --- QUERIES ---

/**
 * Fetches all bookings for the current sitter.
 * Automatically synchronizes and caches data offline.
 */
export function useBookings() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: () => getBookings(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Fetches a single booking by ID.
 * Returns cached data immediately if available from the list.
 */
export function useBooking(id?: string) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['bookings', user?.id, id],
    queryFn: () => getBooking(id!),
    enabled: !!user?.id && !!id,
    initialData: () => {
      // Pre-populate from the list if possible
      return queryClient
        .getQueryData<BookingRecord[]>(['bookings', user?.id])
        ?.find((b) => b.id === id);
    },
  });
}

/**
 * Fetches options needed for creating/editing a booking (Dogs + Profile).
 */
export function useBookingOptions() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['booking-options', user?.id],
    queryFn: () => getBookingFormOptions(user!.id),
    enabled: !!user?.id,
  });
}

// --- MUTATIONS ---

export function useCreateBooking() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateBookingInput, 'sitterId'>) =>
      svcCreateBooking({ ...input, sitterId: user!.id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] });
      logger.info('Booking created successfully, cache invalidated');
    },
  });
}

export function useUpdateBookingStatus() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      svcUpdateBookingStatus(id, user!.id, status),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id, variables.id] });
    },
  });
}

export function useSaveBookingDays() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: EditableBookingDay[] }) =>
      svcSaveBookingDays({ bookingId: id, days, sitterId: user!.id }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id, updated.id] });
    },
  });
}

export function useDeleteBooking() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => svcDeleteBooking(id, user!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] });
    },
  });
}

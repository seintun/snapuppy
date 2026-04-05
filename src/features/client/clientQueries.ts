import { useCallback, useEffect, useState } from 'react';
import { getClientBookings, type ClientBooking } from './clientService';
import { getClientSession } from './clientAuth';

interface UseClientBookingsResult {
  bookings: ClientBooking[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useClientBookings(): UseClientBookingsResult {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const session = getClientSession();

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!session) {
      queueMicrotask(() => {
        setBookings([]);
        setError('No session');
        setLoading(false);
      });
      return;
    }

    let cancelled = false;

    getClientBookings(session.sitterId, session.dogId)
      .then((data) => {
        if (!cancelled) {
          setBookings(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load bookings');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, tick]);

  return { bookings, loading, error, refresh };
}

export function useClientSession() {
  return getClientSession();
}

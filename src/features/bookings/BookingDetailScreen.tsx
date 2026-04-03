import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Warning } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/useToast';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { deleteEvent, type DeleteEventRequest } from '@/lib/gcal';
import { supabase } from '@/lib/supabase';
import {
  getBooking,
  saveBookingDays,
  updateBookingStatus,
  type BookingRecord,
  type EditableBookingDay,
} from '@/lib/bookingService';

export function BookingDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftDays, setDraftDays] = useState<EditableBookingDay[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBooking(id);
      setBooking(data);
      setDraftDays(data.days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const handleToggleDayHoliday = useCallback(
    async (day: EditableBookingDay) => {
      if (!booking) return;
      const updatedDays = draftDays.map((d) =>
        d.id === day.id ? { ...d, is_holiday: !d.is_holiday } : d,
      );
      setDraftDays(updatedDays);
      try {
        const updated = await saveBookingDays({
          bookingId: booking.id,
          sitterId: booking.sitter_id,
          days: updatedDays,
        });
        setBooking(updated);
        setDraftDays(updated.days);
        addToast('Day updated 🐾', 'success');
      } catch {
        setDraftDays(draftDays); // revert
        addToast('Failed to update day', 'error');
      }
    },
    [booking, draftDays, addToast],
  );

  const handleToggleDayType = useCallback(
    async (day: EditableBookingDay) => {
      if (!booking) return;
      const newType = day.rate_type === 'boarding' ? 'daycare' : 'boarding';
      const updatedDays = draftDays.map((d) =>
        d.id === day.id ? { ...d, rate_type: newType as 'boarding' | 'daycare' } : d,
      );
      setDraftDays(updatedDays);
      try {
        const updated = await saveBookingDays({
          bookingId: booking.id,
          sitterId: booking.sitter_id,
          days: updatedDays,
        });
        setBooking(updated);
        setDraftDays(updated.days);
        addToast('Rate type updated 🐾', 'success');
      } catch {
        setDraftDays(draftDays);
        addToast('Failed to update day', 'error');
      }
    },
    [booking, draftDays, addToast],
  );

  const handleCancel = useCallback(async () => {
    if (!booking) return;
    setSaving(true);
    try {
      // Try to delete GCal event
      if (booking.gcal_event_id) {
        try {
          const [sessionData, profileData] = await Promise.all([
            supabase.auth.getSession(),
            supabase
              .from('profiles')
              .select('gcal_calendar_id')
              .eq('id', booking.sitter_id)
              .single(),
          ]);
          const accessToken = sessionData.data.session?.provider_token;
          const profile = profileData.data;

          if (accessToken && profile?.gcal_calendar_id) {
            const req: DeleteEventRequest = {
              accessToken,
              calendarId: profile.gcal_calendar_id,
              eventId: booking.gcal_event_id,
            };
            await deleteEvent(req);
          }
        } catch {
          // non-fatal
        }
      }

      await updateBookingStatus(booking.id, booking.sitter_id, 'cancelled');
      addToast('Booking cancelled', 'info');
      navigate('/bookings');
    } catch {
      addToast('Failed to cancel booking', 'error');
    } finally {
      setSaving(false);
      setCancelConfirm(false);
    }
  }, [booking, navigate, addToast]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          color: 'var(--bark-light)',
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--terracotta)' }}>
        <Warning size={40} style={{ marginBottom: 8 }} />
        <p>{error ?? 'Booking not found'}</p>
        <button className="btn-sage" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const dog = booking.dog;
  const typeLabel = booking.type === 'boarding' ? 'Boarding' : 'Daycare';
  const statusColors: Record<string, string> = {
    active: 'var(--sage)',
    completed: 'var(--bark-light)',
    cancelled: 'var(--terracotta)',
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--cream)',
          padding: '16px 20px 24px',
          borderBottom: '1px solid var(--pebble)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--bark-light)',
            fontWeight: 600,
            fontSize: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={18} weight="bold" />
          Bookings
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {dog ? (
            <DogAvatar name={dog.name} photoUrl={dog.photo_url} size="lg" />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: 'var(--sage-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              🐾
            </div>
          )}

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                color: 'var(--bark)',
                letterSpacing: '-0.03em',
              }}
            >
              {dog?.name ?? 'Unknown Dog'}
            </h1>
            {dog?.owner_name && (
              <div style={{ fontSize: 12, color: 'var(--bark-light)', marginTop: 2 }}>
                {dog.owner_name}
                {dog.owner_phone ? ` · ${dog.owner_phone}` : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'var(--sage)',
                  color: 'white',
                  borderRadius: 99,
                  padding: '2px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {typeLabel}
              </span>
              <span
                style={{
                  background: statusColors[booking.status] ?? 'var(--pebble)',
                  color: 'white',
                  borderRadius: 99,
                  padding: '2px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {booking.status}
              </span>
              {booking.is_holiday && (
                <span
                  style={{
                    background: 'var(--blush)',
                    color: 'var(--terracotta)',
                    borderRadius: 99,
                    padding: '2px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  🎉 Holiday
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Dates + total */}
        <div
          style={{
            background: 'var(--cream)',
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(74,55,40,0.08)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--bark-light)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              Stay
            </div>
            <div style={{ fontWeight: 800, color: 'var(--bark)', fontSize: 14 }}>
              {format(parseISO(booking.start_date), 'MMM d')} →{' '}
              {format(parseISO(booking.end_date), 'MMM d, yyyy')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--bark-light)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              Total
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: 'var(--terracotta)',
                letterSpacing: '-0.04em',
              }}
            >
              ${booking.total_amount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Daily breakdown accordion */}
        <div
          style={{
            background: 'var(--cream)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(74,55,40,0.08)',
          }}
        >
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: 'var(--sage-light)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--bark)',
            }}
          >
            <span>🗓️ Daily Breakdown</span>
            <span
              style={{
                fontSize: 16,
                transition: 'transform 200ms ease',
                display: 'inline-block',
                transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▲
            </span>
          </button>

          {showBreakdown && (
            <div>
              {draftDays.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--bark-light)',
                  }}
                >
                  No daily breakdown available
                </div>
              ) : (
                draftDays.map((day, i) => (
                  <div
                    key={day.id}
                    style={{
                      padding: '12px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: i > 0 ? '1px solid var(--pebble)' : undefined,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--bark)' }}>
                        {format(parseISO(day.date), 'EEE, MMM d')}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                        <button
                          onClick={() => void handleToggleDayType(day)}
                          disabled={booking.status !== 'active'}
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: day.rate_type === 'boarding' ? 'var(--sage)' : 'var(--sky)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 99,
                            padding: '2px 8px',
                            cursor: booking.status === 'active' ? 'pointer' : 'default',
                          }}
                          title="Toggle rate type"
                        >
                          {day.rate_type}
                        </button>
                        {day.is_holiday && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'var(--terracotta)',
                              background: 'var(--blush)',
                              borderRadius: 99,
                              padding: '2px 8px',
                            }}
                          >
                            Holiday
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, color: 'var(--bark)', fontSize: 15 }}>
                        ${day.amount.toFixed(2)}
                      </span>
                      {booking.status === 'active' && (
                        <button
                          onClick={() => void handleToggleDayHoliday(day)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: day.is_holiday ? 'var(--blush)' : 'var(--warm-beige)',
                            fontSize: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Toggle holiday"
                        >
                          🎉
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cancel */}
        {booking.status === 'active' && (
          <div style={{ marginTop: 8 }}>
            {cancelConfirm ? (
              <div
                style={{
                  background: 'var(--blush)',
                  borderRadius: 14,
                  padding: 16,
                  border: '1.5px solid var(--terracotta)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 12px',
                    fontWeight: 700,
                    color: 'var(--terracotta)',
                    fontSize: 14,
                  }}
                >
                  Cancel this booking? This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => void handleCancel()}
                    disabled={saving}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      background: 'var(--terracotta)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    {saving ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      background: 'var(--cream)',
                      color: 'var(--bark)',
                      border: '1.5px solid var(--pebble)',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Keep booking
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCancelConfirm(true)}
                style={{
                  width: '100%',
                  minHeight: 48,
                  background: 'transparent',
                  color: 'var(--terracotta)',
                  border: '1.5px solid var(--terracotta)',
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

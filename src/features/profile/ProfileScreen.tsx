import { useEffect, useState } from 'react';
import { useAuthContext } from '@/features/auth';
import { updateProfile } from './profileService';
import { signInWithGoogle } from '@/lib/supabase';
import { useToast } from '@/components/ui/useToast';

export function ProfileScreen() {
  const { user, profile, signOut } = useAuthContext();
  const { addToast } = useToast();

  const [nightlyRate, setNightlyRate] = useState('');
  const [daycareRate, setDaycareRate] = useState('');
  const [holidaySurcharge, setHolidaySurcharge] = useState('');
  const [cutoffTime, setCutoffTime] = useState('11:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNightlyRate(String(profile.nightly_rate ?? ''));
      setDaycareRate(String(profile.daycare_rate ?? ''));
      setHolidaySurcharge(String(profile.holiday_surcharge ?? ''));
      setCutoffTime(profile.cutoff_time ?? '11:00');
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        nightly_rate: parseFloat(nightlyRate) || 0,
        daycare_rate: parseFloat(daycareRate) || 0,
        holiday_surcharge: parseFloat(holidaySurcharge) || 0,
        cutoff_time: cutoffTime,
      });
      addToast('Woof! Rates saved.', 'success');
    } catch {
      addToast('Could not save rates. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCalendarConnect() {
    try {
      await signInWithGoogle();
    } catch {
      addToast('Could not connect Google Calendar.', 'error');
    }
  }

  const hasCalendar = Boolean(profile?.gcal_calendar_id);

  return (
    <div>
      <h1 className="page-title">Profile</h1>

      {/* Business Rates */}
      <p className="profile-section-title">Business Rates</p>
      <form className="surface-card" onSubmit={handleSave}>
        <div className="flex flex-col gap-4">
          <div className="form-field">
            <label className="form-label" htmlFor="nightly-rate">
              Nightly Boarding Rate
            </label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                id="nightly-rate"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={nightlyRate}
                onChange={(e) => setNightlyRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="daycare-rate">
              Daycare Rate
            </label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                id="daycare-rate"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={daycareRate}
                onChange={(e) => setDaycareRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="holiday-surcharge">
              Holiday Surcharge
            </label>
            <div className="input-with-prefix">
              <span className="input-prefix">+$</span>
              <input
                id="holiday-surcharge"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={holidaySurcharge}
                onChange={(e) => setHolidaySurcharge(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="cutoff-time">
              Checkout Cutoff Time
            </label>
            <input
              id="cutoff-time"
              type="time"
              className="form-input"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-sage" disabled={saving}>
            {saving ? 'Saving…' : 'Save Rates'}
          </button>
        </div>
      </form>

      {/* Account */}
      <p className="profile-section-title">Account</p>
      <div className="surface-card">
        <div className="flex flex-col gap-3.5">
          <div className="form-field">
            <span className="form-label">Name</span>
            <span className="text-base text-bark">
              {profile?.display_name ?? user?.user_metadata?.full_name ?? '—'}
            </span>
          </div>
          <div className="form-field">
            <span className="form-label">Email</span>
            <span className="text-base text-bark">
              {profile?.email ?? user?.email ?? '—'}
            </span>
          </div>
          <button
            onClick={signOut}
            className="bg-transparent border-none pt-2 text-[15px] font-bold text-terracotta cursor-pointer text-left"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Google Calendar */}
      <p className="profile-section-title">Google Calendar</p>
      <div className="surface-card">
        {hasCalendar ? (
          <span className="badge badge--sage">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Snapuppy Bookings calendar connected
          </span>
        ) : (
          <button
            onClick={() => void handleCalendarConnect()}
            className="bg-transparent border-none p-0 text-[15px] font-bold text-sage cursor-pointer underline underline-offset-4"
          >
            Connect Google Calendar
          </button>
        )}
      </div>
    </div>
  );
}

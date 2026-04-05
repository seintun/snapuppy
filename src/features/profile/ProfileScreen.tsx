import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useToast } from '@/components/ui/useToast';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { ProfileSchema, type ProfileFormData } from '@/lib/schemas';
import { generateClientToken } from '@/lib/clientToken';
import {
  SignOut,
  Buildings,
  CurrencyDollar,
  Clock,
  Share,
  Copy,
  Check,
} from '@phosphor-icons/react';
import { TimePicker } from '@/components/ui/TimePicker';
import { SlideUpSheet } from '@/components/ui/SlideUpSheet';

export function ProfileScreen() {
  const { signOut, user } = useAuthContext();
  const { addToast } = useToast();
  const [showClientLink, setShowClientLink] = useState(false);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfileMutation, isPending: saving } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      businessName: '',
      nightlyRate: 0,
      daycareRate: 0,
      holidaySurcharge: 0,
      cutoffTime: '11:00',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        businessName: profile.business_name ?? '',
        nightlyRate: profile.nightly_rate,
        daycareRate: profile.daycare_rate,
        holidaySurcharge: profile.holiday_surcharge,
        cutoffTime: profile.cutoff_time,
      });
      if (profile.client_token) {
        setClientToken(profile.client_token);
      }
    }
  }, [profile, reset]);

  const onSave = useCallback(
    async (data: ProfileFormData) => {
      try {
        await updateProfileMutation({
          business_name: data.businessName || null,
          nightly_rate: data.nightlyRate,
          daycare_rate: data.daycareRate,
          holiday_surcharge: data.holidaySurcharge,
          cutoff_time: data.cutoffTime,
        });
        addToast('Profile saved 🐾', 'success');
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
      }
    },
    [updateProfileMutation, addToast],
  );

  const handleGenerateLink = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const result = await generateClientToken(user.id);
      setClientToken(result.token);
      setShowClientLink(true);
      addToast('Client link generated!', 'success');
    } catch (err) {
      addToast('Failed to generate link', 'error');
    } finally {
      setGenerating(false);
    }
  }, [user, addToast]);

  const handleCopyLink = useCallback(() => {
    if (!clientToken) return;
    const link = `${window.location.origin}/client/${clientToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [clientToken]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-sm text-bark-light">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-extrabold text-bark tracking-tight">Profile</h1>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 text-xs font-bold text-terracotta bg-white border border-pebble rounded-lg px-3 py-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <SignOut size={14} weight="bold" />
          Sign Out
        </button>
      </div>

      {/* Email chip */}
      {user?.email && (
        <div className="flex items-center gap-2 bg-sage-light/40 rounded-xl px-3 py-2">
          <span className="w-6 h-6 rounded-full bg-sage text-white flex items-center justify-center text-xs font-black shrink-0">
            {user.email[0].toUpperCase()}
          </span>
          <span className="text-xs text-bark font-semibold truncate">{user.email}</span>
        </div>
      )}

      {/* Client Portal Link Section */}
      <div className="surface-card !p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Share size={14} weight="bold" className="text-sage" />
            <span className="text-[11px] font-extrabold text-bark-light uppercase tracking-widest">
              Client Portal
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerateLink}
            disabled={generating}
            className="text-xs font-bold text-sage bg-sage-light px-3 py-1.5 rounded-lg"
          >
            {generating ? 'Generating...' : clientToken ? 'View Link' : 'Generate Link'}
          </button>
        </div>
        <p className="text-[10px] text-bark-light mt-2 leading-snug">
          Share this link with clients so they can view their bookings and request new stays.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(onSave)(e)} className="flex flex-col gap-3">
        {/* ── Business Info ── */}
        <div className="surface-card !p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Buildings size={14} weight="bold" className="text-sage" />
            <span className="text-[11px] font-extrabold text-bark-light uppercase tracking-widest">
              Business
            </span>
          </div>
          <div>
            <input
              id="business-name"
              type="text"
              maxLength={100}
              className={`form-input w-full text-sm py-2.5 ${errors.businessName ? 'border-terracotta' : ''}`}
              placeholder="Your business name (optional)"
              {...register('businessName')}
            />
            {errors.businessName && (
              <p className="text-[11px] text-terracotta mt-1">{errors.businessName.message}</p>
            )}
          </div>
        </div>

        {/* ── Rates — 2 × 2 compact grid ── */}
        <div className="surface-card !p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CurrencyDollar size={14} weight="bold" className="text-sage" />
            <span className="text-[11px] font-extrabold text-bark-light uppercase tracking-widest">
              Rates
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Nightly */}
            <div>
              <label
                className="text-[10px] font-bold text-bark-light uppercase tracking-wider block mb-1"
                htmlFor="nightly-rate"
              >
                🌙 Boarding / night
              </label>
              <div className="flex">
                <span className="w-10 flex items-center justify-center bg-sage-light rounded-l-lg font-bold text-sage border border-pebble border-r-0 text-sm shrink-0">
                  $
                </span>
                <input
                  id="nightly-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input rounded-l-none flex-1 text-sm py-2.5 ${errors.nightlyRate ? 'border-terracotta' : ''}`}
                  {...register('nightlyRate', { valueAsNumber: true })}
                />
              </div>
              {errors.nightlyRate && (
                <p className="text-[10px] text-terracotta mt-0.5">{errors.nightlyRate.message}</p>
              )}
            </div>

            {/* Daycare */}
            <div>
              <label
                className="text-[10px] font-bold text-bark-light uppercase tracking-wider block mb-1"
                htmlFor="daycare-rate"
              >
                ☀️ Daycare / day
              </label>
              <div className="flex">
                <span className="w-10 flex items-center justify-center bg-sage-light rounded-l-lg font-bold text-sage border border-pebble border-r-0 text-sm shrink-0">
                  $
                </span>
                <input
                  id="daycare-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input rounded-l-none flex-1 text-sm py-2.5 ${errors.daycareRate ? 'border-terracotta' : ''}`}
                  {...register('daycareRate', { valueAsNumber: true })}
                />
              </div>
              {errors.daycareRate && (
                <p className="text-[10px] text-terracotta mt-0.5">{errors.daycareRate.message}</p>
              )}
            </div>

            {/* Holiday surcharge */}
            <div>
              <label
                className="text-[10px] font-bold text-bark-light uppercase tracking-wider block mb-1"
                htmlFor="holiday-surcharge"
              >
                🎄 Holiday surcharge
              </label>
              <div className="flex">
                <span className="w-10 flex items-center justify-center bg-blush/60 rounded-l-lg font-bold text-terracotta border border-pebble border-r-0 text-sm shrink-0">
                  +$
                </span>
                <input
                  id="holiday-surcharge"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input rounded-l-none flex-1 text-sm py-2.5 ${errors.holidaySurcharge ? 'border-terracotta' : ''}`}
                  {...register('holidaySurcharge', { valueAsNumber: true })}
                />
              </div>
              {errors.holidaySurcharge && (
                <p className="text-[10px] text-terracotta mt-0.5">
                  {errors.holidaySurcharge.message}
                </p>
              )}
            </div>

            {/* Cutoff time */}
            <div>
              <label
                className="text-[10px] font-bold text-bark-light uppercase tracking-wider block mb-1"
                htmlFor="cutoff-time"
              >
                🕐 Pickup cut-off
              </label>
              <div className="flex">
                <span className="w-10 flex items-center justify-center bg-sky/20 rounded-l-lg font-bold text-bark border border-pebble border-r-0 text-sm shrink-0">
                  <Clock size={16} weight="bold" className="text-bark-light" />
                </span>
                <div className="flex-1">
                  <TimePicker
                    value={watch('cutoffTime')}
                    onChange={(v) =>
                      setValue('cutoffTime', v, { shouldValidate: true, shouldDirty: true })
                    }
                    error={!!errors.cutoffTime}
                    className="rounded-l-none border-l-0"
                    hideIcon={true}
                  />
                </div>
              </div>
              {errors.cutoffTime && (
                <p className="text-[10px] text-terracotta mt-0.5">{errors.cutoffTime.message}</p>
              )}
            </div>
          </div>

          {/* Cutoff hint */}
          <p className="text-[10px] text-bark-light mt-2 leading-snug">
            Pickups after cut-off time add a daycare charge on the final day.
          </p>
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="btn-sage sticky bottom-[calc(80px+env(safe-area-inset-bottom))] shadow-lg shadow-sage/20 z-10"
          disabled={saving || !isDirty}
        >
          {saving ? 'Saving…' : 'Save Changes 🐾'}
        </button>
      </form>

      {/* Client Link Modal */}
      <SlideUpSheet
        isOpen={showClientLink}
        onClose={() => setShowClientLink(false)}
        title="Client Portal Link"
      >
        <div className="flex flex-col gap-4 p-2">
          <p className="text-sm text-bark-light">
            Share this link with your clients. They can use it to view their bookings and request
            new stays.
          </p>
          <div className="flex items-center gap-2 bg-pebble/20 rounded-xl p-3">
            <input
              type="text"
              readOnly
              value={clientToken ? `${window.location.origin}/client/${clientToken}` : ''}
              className="flex-1 bg-transparent text-sm text-bark truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 bg-sage text-white rounded-lg"
            >
              {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}
            </button>
          </div>
          {copied && <p className="text-xs text-sage text-center">Link copied to clipboard!</p>}
        </div>
      </SlideUpSheet>
    </div>
  );
}

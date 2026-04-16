import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { TimePicker } from '@/components/ui/TimePicker';
import { useToast } from '@/components/ui/useToast';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { ProfileSchema, type ProfileFormData } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Buildings, Clock, CurrencyDollar, SignOut } from '@phosphor-icons/react';
import { useCallback, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

export function ProfileScreen() {
  const { signOut, user } = useAuthContext();
  const { addToast } = useToast();

  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfileMutation, isPending: saving } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      businessName: '',
      businessLogoUrl: '',
      paymentInstructions: '',
      nightlyRate: 0,
      daycareRate: 0,
      holidayBoardingRate: 0,
      holidayDaycareRate: 0,
      cutoffTime: '11:00',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        businessName: profile.business_name ?? '',
        businessLogoUrl: profile.business_logo_url ?? '',
        paymentInstructions: profile.payment_instructions ?? '',
        nightlyRate: profile.nightly_rate,
        daycareRate: profile.daycare_rate,
        holidayBoardingRate: profile.holiday_boarding_rate,
        holidayDaycareRate: profile.holiday_daycare_rate,
        cutoffTime: profile.cutoff_time,
      });
    }
  }, [profile, reset]);

  const cutoffTime = useWatch({ control, name: 'cutoffTime' });
  const nightlyRate = useWatch({ control, name: 'nightlyRate' });
  const daycareRate = useWatch({ control, name: 'daycareRate' });
  const holidayBoardingRate = useWatch({ control, name: 'holidayBoardingRate' });
  const holidayDaycareRate = useWatch({ control, name: 'holidayDaycareRate' });

  const showHolidayRateReminder =
    (nightlyRate > 0 && holidayBoardingRate === 0) || (daycareRate > 0 && holidayDaycareRate === 0);

  const onSave = useCallback(
    async (data: ProfileFormData) => {
      try {
        await updateProfileMutation({
          business_name: data.businessName || null,
          business_logo_url: data.businessLogoUrl || null,
          payment_instructions: data.paymentInstructions || null,
          nightly_rate: data.nightlyRate,
          daycare_rate: data.daycareRate,
          holiday_boarding_rate: data.holidayBoardingRate,
          holiday_daycare_rate: data.holidayDaycareRate,
          cutoff_time: data.cutoffTime,
        });
        addToast('Profile saved 🐾', 'success');
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
      }
    },
    [updateProfileMutation, addToast],
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <AppLoadingAnimation size="md" label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-extrabold text-bark tracking-tight">Profile</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 whitespace-nowrap flex items-center gap-1.5 text-xs font-bold text-terracotta bg-white border border-pebble rounded-lg px-3 py-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <SignOut size={14} weight="bold" />
            Sign Out
          </button>
        </div>
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
            <input
              id="business-logo-url"
              type="url"
              className={`form-input w-full text-sm py-2.5 mt-2 ${errors.businessLogoUrl ? 'border-terracotta' : ''}`}
              placeholder="Business logo URL"
              {...register('businessLogoUrl')}
            />
            <textarea
              id="payment-instructions"
              className={`form-input w-full text-sm py-2.5 mt-2 ${errors.paymentInstructions ? 'border-terracotta' : ''}`}
              placeholder="Payment instructions (Venmo/CashApp/Zelle)"
              {...register('paymentInstructions')}
            />
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
                🌙 Boarding
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
                  {...register('nightlyRate', {
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
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
                ☀️ Daycare
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
                  {...register('daycareRate', {
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                />
              </div>
              {errors.daycareRate && (
                <p className="text-[10px] text-terracotta mt-0.5">{errors.daycareRate.message}</p>
              )}
            </div>

            {/* Holiday boarding rate */}
            <div>
              <label
                className="text-[10px] font-bold text-bark-light uppercase tracking-wider block mb-1"
                htmlFor="holiday-boarding-rate"
              >
                🎄 Holiday boarding
              </label>
              <div className="flex">
                <span className="w-10 flex items-center justify-center bg-blush/60 rounded-l-lg font-bold text-terracotta border border-pebble border-r-0 text-sm shrink-0">
                  $
                </span>
                <input
                  id="holiday-boarding-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input rounded-l-none flex-1 text-sm py-2.5 ${errors.holidayBoardingRate ? 'border-terracotta' : ''}`}
                  {...register('holidayBoardingRate', {
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                />
              </div>
              {errors.holidayBoardingRate && (
                <p className="text-[10px] text-terracotta mt-0.5">
                  {errors.holidayBoardingRate.message}
                </p>
              )}
            </div>

            {/* Holiday daycare rate */}
            <div>
              <label
                className="text-[10px] font-bold text-bark-light uppercase tracking-wider block mb-1"
                htmlFor="holiday-daycare-rate"
              >
                🎄 Holiday daycare
              </label>
              <div className="flex">
                <span className="w-10 flex items-center justify-center bg-blush/60 rounded-l-lg font-bold text-terracotta border border-pebble border-r-0 text-sm shrink-0">
                  $
                </span>
                <input
                  id="holiday-daycare-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input rounded-l-none flex-1 text-sm py-2.5 ${errors.holidayDaycareRate ? 'border-terracotta' : ''}`}
                  {...register('holidayDaycareRate', {
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                />
              </div>
              {errors.holidayDaycareRate && (
                <p className="text-[10px] text-terracotta mt-0.5">
                  {errors.holidayDaycareRate.message}
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
                    value={cutoffTime}
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
          {showHolidayRateReminder && (
            <div className="mt-2 rounded-lg border border-pebble/60 bg-cream px-2.5 py-2 text-[10px] font-medium text-bark-light">
              Holiday rates are currently $0. Set them if you charge differently on holidays.
            </div>
          )}
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
    </div>
  );
}

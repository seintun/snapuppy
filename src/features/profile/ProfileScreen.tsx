import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useToast } from '@/components/ui/useToast';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { ProfileSchema, type ProfileFormData } from '@/lib/schemas';

export function ProfileScreen() {
  const { signOut } = useAuthContext();
  const { addToast } = useToast();
  
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfileMutation, isPending: saving } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
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

  // Sync form with profile data when it loads
  useEffect(() => {
    if (profile) {
      reset({
        businessName: profile.business_name,
        nightlyRate: profile.nightly_rate,
        daycareRate: profile.daycare_rate,
        holidaySurcharge: profile.holiday_surcharge,
        cutoffTime: profile.cutoff_time,
      });
    }
  }, [profile, reset]);

  const onSave = useCallback(
    async (data: ProfileFormData) => {
      try {
        await updateProfileMutation({
          business_name: data.businessName,
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-sm text-bark-light">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title !m-0">Profile</h1>
        <button
          onClick={() => void signOut()}
          className="text-xs font-bold text-terracotta bg-white border border-pebble rounded-lg px-3 py-1.5 shadow-sm active:scale-95 transition-transform"
        >
          Sign Out
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(onSave)(e)} className="flex flex-col gap-6">
        {/* Business Settings */}
        <div className="surface-card">
          <h2 className="profile-section-title !mt-0">Business Info</h2>
          <div className="form-field mt-3">
            <label className="form-label" htmlFor="business-name">
              Business Name
            </label>
            <input
              id="business-name"
              type="text"
              className={`form-input ${errors.businessName ? 'border-terracotta' : ''}`}
              placeholder="e.g. Happy Paws"
              {...register('businessName')}
            />
            {errors.businessName && (
              <p className="text-xs text-terracotta mt-1">{errors.businessName.message}</p>
            )}
          </div>
        </div>

        {/* Standard Rates */}
        <div className="surface-card">
          <h2 className="profile-section-title !mt-0">Standard Rates</h2>
          <div className="grid grid-cols-1 gap-4 mt-3">
            <div className="form-field">
              <label className="form-label" htmlFor="nightly-rate">
                Nightly Rate (Boarding)
              </label>
              <div className="flex">
                <span className="flex items-center bg-sage-light rounded-l-lg px-3 font-bold text-bark-light border border-pebble border-r-0 text-sm">
                  $
                </span>
                <input
                  id="nightly-rate"
                  type="number"
                  step="0.01"
                  className={`form-input rounded-l-none flex-1 ${
                    errors.nightlyRate ? 'border-terracotta' : ''
                  }`}
                  {...register('nightlyRate', { valueAsNumber: true })}
                />
              </div>
              {errors.nightlyRate && (
                <p className="text-xs text-terracotta mt-1">{errors.nightlyRate.message}</p>
              )}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="daycare-rate">
                Daycare Rate
              </label>
              <div className="flex">
                <span className="flex items-center bg-sage-light rounded-l-lg px-3 font-bold text-bark-light border border-pebble border-r-0 text-sm">
                  $
                </span>
                <input
                  id="daycare-rate"
                  type="number"
                  step="0.01"
                  className={`form-input rounded-l-none flex-1 ${
                    errors.daycareRate ? 'border-terracotta' : ''
                  }`}
                  {...register('daycareRate', { valueAsNumber: true })}
                />
              </div>
              {errors.daycareRate && (
                <p className="text-xs text-terracotta mt-1">{errors.daycareRate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Special Rules */}
        <div className="surface-card">
          <h2 className="profile-section-title !mt-0">Surcharges & Rules</h2>
          <div className="grid grid-cols-1 gap-4 mt-3">
            <div className="form-field">
              <label className="form-label" htmlFor="holiday-surcharge">
                Holiday Surcharge (Per Night)
              </label>
              <div className="flex">
                <span className="flex items-center bg-sage-light rounded-l-lg px-3 font-bold text-bark-light border border-pebble border-r-0 text-sm">
                  + $
                </span>
                <input
                  id="holiday-surcharge"
                  type="number"
                  step="0.01"
                  className={`form-input rounded-l-none flex-1 ${
                    errors.holidaySurcharge ? 'border-terracotta' : ''
                  }`}
                  {...register('holidaySurcharge', { valueAsNumber: true })}
                />
              </div>
              {errors.holidaySurcharge && (
                <p className="text-xs text-terracotta mt-1">{errors.holidaySurcharge.message}</p>
              )}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="cutoff-time">
                Pickup Cut-off Time
              </label>
              <input
                id="cutoff-time"
                type="time"
                className={`form-input ${errors.cutoffTime ? 'border-terracotta' : ''}`}
                {...register('cutoffTime')}
              />
              <p className="text-[11px] text-bark-light leading-snug">
                Pickups after this time will incur an additional daycare charge on the final day.
              </p>
              {errors.cutoffTime && (
                <p className="text-xs text-terracotta mt-1">{errors.cutoffTime.message}</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn-sage mt-2 sticky bottom-[calc(84px+env(safe-area-inset-bottom))] shadow-lg shadow-sage/30 z-10"
          disabled={saving || !isDirty}
        >
          {saving ? 'Saving Changes…' : 'Save Profile Changes 🐾'}
        </button>
      </form>
    </div>
  );
}

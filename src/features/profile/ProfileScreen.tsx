import { AppLoadingAnimation } from '@/components/ui/AppLoadingAnimation';
import { TimePicker } from '@/components/ui/TimePicker';
import { useToast } from '@/components/ui/useToast';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { uploadBusinessLogo } from '@/features/profile/logoUpload';
import {
  useProfile,
  useUpdateProfile,
  parsePaymentMethods,
  isLegacyPaymentInstructions,
  serializePaymentMethods,
} from '@/hooks/useProfile';
import { ProfileSchema, PaymentMethodSchema, type ProfileFormData, type PaymentMethod } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Clock,
  CurrencyCircleDollar,
  SignOut,
  Camera,
  X,
  Plus,
  Warning,
  PencilSimple,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

const PAYMENT_TYPES = ['venmo', 'cashapp', 'zelle'] as const;
type PaymentType = (typeof PAYMENT_TYPES)[number];

const PAYMENT_LABELS: Record<PaymentType, string> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  zelle: 'Zelle',
};

const PAYMENT_PREFIX: Record<PaymentType, string> = {
  venmo: '@',
  cashapp: '$',
  zelle: '',
};

function applyPrefix(type: PaymentType, handle: string): string {
  const prefix = PAYMENT_PREFIX[type];
  if (!prefix) return handle;
  if (handle.startsWith(prefix)) return handle;
  return prefix + handle;
}

// ── Identity Hero ─────────────────────────────────────────────────────────────

interface LogoCircleProps {
  logoUrl: string | null | undefined;
  displayName: string;
  uploading: boolean;
  onPickFile: () => void;
}

function LogoCircle({ logoUrl, displayName, uploading, onPickFile }: LogoCircleProps) {
  const initial = displayName.trim()[0]?.toUpperCase() ?? '?';

  return (
    <button
      type="button"
      onClick={onPickFile}
      className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden group focus:outline-none"
      aria-label="Change logo"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Business logo"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="w-full h-full flex items-center justify-center bg-sage text-white text-3xl font-black">
          {initial}
        </span>
      )}

      {/* Overlay on hover/tap */}
      <span className="absolute inset-0 bg-bark/30 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
        <Camera size={22} weight="bold" className="text-white" />
      </span>

      {/* Upload spinner */}
      {uploading && (
        <span className="absolute inset-0 bg-bark/50 flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </span>
      )}
    </button>
  );
}

// ── Payment Row ────────────────────────────────────────────────────────────────

interface PaymentRowProps {
  index: number;
  method: PaymentMethod;
  usedTypes: Set<PaymentType>;
  onChange: (index: number, method: PaymentMethod) => void;
  onRemove: (index: number) => void;
  error?: string;
}

function PaymentRow({ index, method, usedTypes, onChange, onRemove, error }: PaymentRowProps) {
  const handleTypeChange = (newType: PaymentType) => {
    onChange(index, { type: newType, handle: '' } as PaymentMethod);
  };

  const handleHandleChange = (raw: string) => {
    const prefixed = applyPrefix(method.type as PaymentType, raw);
    onChange(index, { ...method, handle: prefixed } as PaymentMethod);
  };

  const placeholder =
    method.type === 'zelle'
      ? 'Email or phone number'
      : `${PAYMENT_PREFIX[method.type as PaymentType]}username`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {/* Type pill selector */}
        <div className="flex gap-1 shrink-0">
          {PAYMENT_TYPES.map((t) => {
            const isActive = method.type === t;
            const isDisabledType = !isActive && usedTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                disabled={isDisabledType}
                onClick={() => handleTypeChange(t)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${
                  isActive
                    ? 'bg-sage text-white'
                    : isDisabledType
                      ? 'bg-pebble text-bark-light opacity-40 cursor-not-allowed'
                      : 'bg-pebble text-bark-light hover:bg-sage-light active:scale-95'
                }`}
              >
                {PAYMENT_LABELS[t]}
              </button>
            );
          })}
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="ml-auto p-1 text-bark-light hover:text-terracotta active:scale-95 transition-colors"
          aria-label="Remove payment method"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Handle input */}
      <input
        type={method.type === 'zelle' ? 'text' : 'text'}
        value={method.handle}
        onChange={(e) => handleHandleChange(e.target.value)}
        placeholder={placeholder}
        className={`form-input w-full text-sm py-2 ${error ? 'border-terracotta' : ''}`}
      />
      {error && <p className="text-[10px] text-terracotta">{error}</p>}
    </div>
  );
}

// ── ProfileScreen ──────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { signOut, user } = useAuthContext();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentErrors, setPaymentErrors] = useState<Record<number, string>>({});
  const [paymentDirty, setPaymentDirty] = useState(false);
  const [legacyPayment, setLegacyPayment] = useState<string | null>(null);

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
      displayName: '',
      businessLogoUrl: '',
      paymentMethods: [],
      nightlyRate: 0,
      daycareRate: 0,
      holidayBoardingRate: 0,
      holidayDaycareRate: 0,
      cutoffTime: '11:00',
    },
  });

  useEffect(() => {
    if (profile) {
      const rawPayment = profile.payment_instructions;
      if (isLegacyPaymentInstructions(rawPayment)) {
        setLegacyPayment(rawPayment ?? null);
        setPaymentMethods([]);
      } else {
        setLegacyPayment(null);
        setPaymentMethods(parsePaymentMethods(rawPayment));
      }

      reset({
        displayName: profile.display_name ?? '',
        businessLogoUrl: profile.business_logo_url ?? '',
        paymentMethods: parsePaymentMethods(rawPayment),
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
  const currentLogoUrl = useWatch({ control, name: 'businessLogoUrl' });
  const currentDisplayName = useWatch({ control, name: 'displayName' });

  const showHolidayRateReminder =
    (nightlyRate > 0 && holidayBoardingRate === 0) || (daycareRate > 0 && holidayDaycareRate === 0);

  const usedPaymentTypes = new Set(paymentMethods.map((m) => m.type as PaymentType));
  const canAddPaymentMethod = paymentMethods.length < 3 && usedPaymentTypes.size < 3;

  // ── Logo upload ──
  const handleLogoFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.id) return;
      setLogoUploading(true);
      try {
        const url = await uploadBusinessLogo(user.id, file);
        setValue('businessLogoUrl', url, { shouldDirty: true });
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Logo upload failed', 'error');
      } finally {
        setLogoUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [user, setValue, addToast],
  );

  // ── Payment row handlers ──
  const handlePaymentChange = useCallback((index: number, method: PaymentMethod) => {
    setPaymentMethods((prev) => {
      const next = [...prev];
      next[index] = method;
      return next;
    });
    setPaymentDirty(true);
    setPaymentErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const handlePaymentRemove = useCallback((index: number) => {
    setPaymentMethods((prev) => prev.filter((_, i) => i !== index));
    setPaymentDirty(true);
    setPaymentErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const handleAddPaymentMethod = useCallback(() => {
    const used = new Set(paymentMethods.map((m) => m.type));
    const next = PAYMENT_TYPES.find((t) => !used.has(t));
    if (!next) return;
    setPaymentMethods((prev) => [...prev, { type: next, handle: '' } as PaymentMethod]);
    setPaymentDirty(true);
  }, [paymentMethods]);

  // ── Validate payment methods ──
  const validatePaymentMethods = (): boolean => {
    const errs: Record<number, string> = {};
    let valid = true;
    paymentMethods.forEach((m, i) => {
      const result = PaymentMethodSchema.safeParse(m);
      if (!result.success) {
        errs[i] = result.error.issues[0]?.message ?? 'Invalid';
        valid = false;
      }
    });
    setPaymentErrors(errs);
    return valid;
  };

  // ── Save ──
  const onSave = useCallback(
    async (data: ProfileFormData) => {
      if (!validatePaymentMethods()) return;

      try {
        await updateProfileMutation({
          display_name: data.displayName || null,
          business_logo_url: data.businessLogoUrl || null,
          payment_instructions: serializePaymentMethods(paymentMethods),
          nightly_rate: data.nightlyRate,
          daycare_rate: data.daycareRate,
          holiday_boarding_rate: data.holidayBoardingRate,
          holiday_daycare_rate: data.holidayDaycareRate,
          cutoff_time: data.cutoffTime,
        });
        setPaymentDirty(false);
        setLegacyPayment(null);
        addToast('Profile saved', 'success');
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
      }
    },
    [updateProfileMutation, addToast, paymentMethods],
  );

  const isFormDirty = isDirty || paymentDirty;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <AppLoadingAnimation size="md" label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      <form onSubmit={(e) => void handleSubmit(onSave)(e)} className="flex flex-col gap-3">
        {/* ── Identity Hero ── */}
        <div className="surface-card !p-4">
          <div className="flex items-start gap-4">
            {/* Logo circle */}
            <LogoCircle
              logoUrl={currentLogoUrl}
              displayName={currentDisplayName || 'S'}
              uploading={logoUploading}
              onPickFile={() => fileInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleLogoFileChange(e)}
            />

            {/* Name + email */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-1">
              <div className="relative">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Snapuppy Sitter"
                  className="form-input w-full text-sm font-bold text-bark pr-7 py-2"
                  {...register('displayName')}
                />
                <PencilSimple
                  size={13}
                  weight="bold"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bark-light pointer-events-none"
                />
              </div>
              {errors.displayName && (
                <p className="text-[10px] text-terracotta">{errors.displayName.message}</p>
              )}
              {user?.email && (
                <span className="text-xs text-bark-light truncate">{user.email}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Payment Methods ── */}
        <div className="surface-card !p-3">
          <div className="flex items-center gap-1.5 mb-3">
            <CurrencyCircleDollar size={14} weight="bold" className="text-sage" />
            <span className="text-[11px] font-extrabold text-bark-light uppercase tracking-widest">
              Payment
            </span>
          </div>

          {/* Legacy payment instructions warning */}
          {legacyPayment && (
            <div className="flex items-start gap-2 mb-3 rounded-lg border border-sunshine/60 bg-sunshine/10 px-2.5 py-2">
              <Warning size={14} weight="bold" className="text-bark-light shrink-0 mt-0.5" />
              <p className="text-[11px] text-bark-light leading-snug">
                You have old-style payment instructions. Save new methods below to replace them.
              </p>
            </div>
          )}

          {paymentMethods.length === 0 && !legacyPayment && (
            <p className="text-[11px] text-bark-light mb-3">
              No payment methods added. Clients won't see payment info.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {paymentMethods.map((method, i) => (
              <PaymentRow
                key={i}
                index={i}
                method={method}
                usedTypes={usedPaymentTypes}
                onChange={handlePaymentChange}
                onRemove={handlePaymentRemove}
                error={paymentErrors[i]}
              />
            ))}
          </div>

          {canAddPaymentMethod && (
            <button
              type="button"
              onClick={handleAddPaymentMethod}
              className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-sage active:scale-95 transition-transform"
            >
              <Plus size={14} weight="bold" />
              Add payment method
            </button>
          )}
        </div>

        {/* ── Rates ── */}
        <div className="surface-card !p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
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
                  {...register('daycareRate', {
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                />
              </div>
              {errors.daycareRate && (
                <p className="text-[10px] text-terracotta mt-0.5">{errors.daycareRate.message}</p>
              )}
            </div>

            {/* Holiday boarding */}
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

            {/* Holiday daycare */}
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

          <p className="text-[10px] text-bark-light mt-2 leading-snug">
            Pickups after cut-off time add a daycare charge on the final day.
          </p>
          {showHolidayRateReminder && (
            <div className="mt-2 rounded-lg border border-pebble/60 bg-cream px-2.5 py-2 text-[10px] font-medium text-bark-light">
              ⚠️ Holiday rates are $0. Set them if you charge differently on holidays.
            </div>
          )}
        </div>

        {/* Save */}
        <button
          type="submit"
          className="btn-sage sticky bottom-[calc(80px+env(safe-area-inset-bottom))] shadow-lg shadow-sage/20 z-10"
          disabled={saving || !isFormDirty}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Sign Out */}
      <div className="mt-2">
        {!confirmSignOut ? (
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-bark-light border border-pebble rounded-xl py-3 bg-cream active:scale-95 transition-transform"
          >
            <SignOut size={16} weight="bold" />
            Sign Out
          </button>
        ) : (
          <div className="surface-card !p-3 flex flex-col gap-2">
            <p className="text-sm font-semibold text-bark text-center">Sign out of Snapuppy?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmSignOut(false)}
                className="flex-1 py-2.5 rounded-xl border border-pebble text-sm font-bold text-bark-light bg-cream active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex-1 py-2.5 rounded-xl bg-terracotta text-white text-sm font-bold active:scale-95 transition-transform"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

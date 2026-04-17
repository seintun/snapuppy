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
import { formatPhoneProgressive, isZellePhone, normalizeZelleHandle } from '@/lib/paymentUtils';
import { ProfileSchema, PaymentMethodSchema, type ProfileFormData, type PaymentMethod } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Clock,
  CurrencyCircleDollar,
  SignOut,
  Camera,
  X,
  Warning,
  PencilSimple,
  Check,
  Trash,
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

// ── Payment Methods Panel ────────────────────────────────────────────────────────

interface PaymentPanelProps {
  initialMethods: PaymentMethod[];
  legacyText: string | null;
  onSave: (methods: PaymentMethod[]) => Promise<void>;
  saving: boolean;
}

// Brand icon badges for each payment type
const PAYMENT_ICON: Record<PaymentType, { bg: string; text: string; label: string }> = {
  venmo:   { bg: 'bg-[#008cff]/10', text: 'text-[#008cff]', label: 'V' },
  cashapp: { bg: 'bg-[#00d64f]/10', text: 'text-[#00a843]', label: '$' },
  zelle:   { bg: 'bg-[#6e24c8]/10', text: 'text-[#6e24c8]', label: 'Z' },
};

function PaymentMethodsPanel({ initialMethods, legacyText, onSave, saving }: PaymentPanelProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods);
  const [addingType, setAddingType] = useState<PaymentType | null>(null);
  const [addHandle, setAddHandle] = useState('');
  const [addError, setAddError] = useState('');
  const [pendingSave, setPendingSave] = useState(false);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  useEffect(() => { setMethods(initialMethods); }, [initialMethods]);

  const usedTypes = new Set(methods.map((m) => m.type as PaymentType));
  const isBusy = saving || pendingSave;

  const validateHandle = (type: PaymentType, handle: string): string => {
    let toValidate = handle.trim();
    if (type === 'venmo') toValidate = toValidate.replace(/^@/, '');
    if (type === 'cashapp') toValidate = toValidate.replace(/^\$/, '');
    if (type === 'zelle') toValidate = normalizeZelleHandle(toValidate);

    if (!toValidate) return 'Handle is required';
    const result = PaymentMethodSchema.safeParse({ type, handle: toValidate });
    if (!result.success) {
      if (type === 'zelle') {
        return 'Enter a valid email (e.g. name@email.com) or 10-digit US phone (e.g. 2125551234)';
      }
      return result.error.issues[0]?.message ?? 'Handle is required';
    }
    return '';
  };

  // ── Add ──
  const handleSelectAddType = (type: PaymentType) => {
    setAddingType(type);
    setAddHandle(PAYMENT_PREFIX[type]);
    setAddError('');
  };

  const handleConfirmAdd = async () => {
    let finalHandle = addHandle.trim();
    if (addingType === 'zelle') finalHandle = normalizeZelleHandle(finalHandle);

    const err = validateHandle(addingType!, finalHandle);
    if (err) { setAddError(err); return; }
    
    const next = [...methods, { type: addingType!, handle: finalHandle } as PaymentMethod];
    setPendingSave(true);
    try {
      await onSave(next);
      setMethods(next);
      setAddingType(null);
      setAddHandle('');
    } finally {
      setPendingSave(false);
    }
  };

  // ── Delete ──
  const handleDeleteConfirm = async (index: number) => {
    const next = methods.filter((_, i) => i !== index);
    setPendingSave(true);
    try {
      await onSave(next);
      setMethods(next);
      setConfirmDeleteIndex(null);
    } finally {
      setPendingSave(false);
    }
  };

  return (
    <div className="surface-card !p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <CurrencyCircleDollar size={14} weight="bold" className="text-sage" />
        <span className="text-[11px] font-extrabold text-bark-light uppercase tracking-widest">
          Payment
        </span>
      </div>

      {legacyText && (
        <div className="flex items-start gap-2 mb-3 rounded-lg border border-sunshine/60 bg-sunshine/10 px-2.5 py-2">
          <Warning size={14} weight="bold" className="text-bark-light shrink-0 mt-0.5" />
          <p className="text-[11px] text-bark-light leading-snug">
            You have old-style payment instructions. Add new methods below to replace them.
          </p>
        </div>
      )}

      {/* Saved rows */}
      {methods.length > 0 && (
        <div className="flex flex-col divide-y divide-pebble mb-3 border border-pebble rounded-xl overflow-hidden">
          {methods.map((m, i) => {
            const type = m.type as PaymentType;
            const icon = PAYMENT_ICON[type];
            let displayHandle = m.handle;

            // Auto-format Zelle phone in saved rows for display.
            if (type === 'zelle' && isZellePhone(m.handle)) {
              displayHandle = formatPhoneProgressive(m.handle);
            }

            if (confirmDeleteIndex === i) {
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-blush/20">
                  <span className="text-xs font-semibold text-bark flex-1">
                    Remove {PAYMENT_LABELS[type]}?
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteIndex(null)}
                    className="text-[11px] font-bold text-bark-light px-2 py-1 rounded-lg border border-pebble bg-cream active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteConfirm(i)}
                    disabled={isBusy}
                    className="text-[11px] font-bold text-white bg-terracotta px-2 py-1 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              );
            }

            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                {/* Brand icon badge */}
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${icon.bg} ${icon.text}`}>
                  {icon.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-bark-light uppercase tracking-wide leading-none mb-0.5">
                    {PAYMENT_LABELS[type]}
                  </p>
                  <p className="text-sm text-bark truncate">{displayHandle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteIndex(i)}
                  disabled={isBusy}
                  className="p-1.5 text-bark-light hover:text-terracotta active:scale-95 transition-colors disabled:opacity-40"
                  aria-label="Remove"
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {methods.length === 0 && !legacyText && !addingType && (
        <p className="text-[11px] text-bark-light mb-3">
          No payment methods. Clients won't see payment info.
        </p>
      )}

      {/* Add form */}
      {addingType ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${PAYMENT_ICON[addingType].bg} ${PAYMENT_ICON[addingType].text}`}>
              {PAYMENT_ICON[addingType].label}
            </span>
            <span className="text-[11px] font-extrabold text-bark uppercase tracking-wide">
              {PAYMENT_LABELS[addingType]}
            </span>
            <button
              type="button"
              onClick={() => { setAddingType(null); setAddHandle(''); setAddError(''); }}
              className="ml-auto text-bark-light active:scale-95 transition-transform"
              aria-label="Cancel"
            >
              <X size={15} weight="bold" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={addHandle}
              autoFocus
              onChange={(e) => {
                let val = e.target.value;
                if (addingType === 'zelle') {
                  val = isZellePhone(val) ? formatPhoneProgressive(val) : val;
                } else {
                  val = applyPrefix(addingType, val);
                }
                setAddHandle(val);
                setAddError('');
              }}
              placeholder={
                addingType === 'zelle' ? 'name@email.com or (212) 555-1234' :
                addingType === 'cashapp' ? '$cashtag' :
                '@venmo-username'
              }
              className={`form-input flex-1 text-sm py-1.5 ${addError ? 'border-terracotta' : ''}`}
            />
            <button
              type="button"
              onClick={() => void handleConfirmAdd()}
              disabled={isBusy}
              className="shrink-0 w-9 self-stretch flex items-center justify-center bg-sage text-white rounded-lg active:scale-95 transition-transform disabled:opacity-50"
              aria-label="Save"
            >
              {isBusy ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={16} weight="bold" />
              )}
            </button>
          </div>
          {addError && <p className="text-[10px] text-terracotta">{addError}</p>}
        </div>
      ) : (
        usedTypes.size < 3 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-bark-light font-semibold">Add:</span>
            {PAYMENT_TYPES.filter((t) => !usedTypes.has(t)).map((t) => {
              const icon = PAYMENT_ICON[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectAddType(t)}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border active:scale-95 transition-transform ${icon.bg} ${icon.text} border-current/20`}
                >
                  <span className="font-black text-[10px]">{icon.label}</span>
                  {PAYMENT_LABELS[t]}
                </button>
              );
            })}
          </div>
        )
      )}
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
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([]);
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
        setSavedPaymentMethods([]);
      } else {
        setLegacyPayment(null);
        setSavedPaymentMethods(parsePaymentMethods(rawPayment));
      }

      reset({
        displayName: profile.display_name ?? '',
        businessLogoUrl: profile.business_logo_url ?? '',
        paymentMethods: [],
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

  // ── Payment inline save ──
  const handleSavePaymentMethods = useCallback(
    async (methods: PaymentMethod[]) => {
      await updateProfileMutation({
        payment_instructions: serializePaymentMethods(methods),
      });
      setLegacyPayment(null);
    },
    [updateProfileMutation],
  );

  // ── Save (identity + rates only) ──
  const onSave = useCallback(
    async (data: ProfileFormData) => {
      try {
        await updateProfileMutation({
          display_name: data.displayName || null,
          business_logo_url: data.businessLogoUrl || null,
          nightly_rate: data.nightlyRate,
          daycare_rate: data.daycareRate,
          holiday_boarding_rate: data.holidayBoardingRate,
          holiday_daycare_rate: data.holidayDaycareRate,
          cutoff_time: data.cutoffTime,
        });
        addToast('Profile saved', 'success');
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
        <PaymentMethodsPanel
          initialMethods={savedPaymentMethods}
          legacyText={legacyPayment}
          onSave={handleSavePaymentMethods}
          saving={saving}
        />

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
          disabled={saving || !isDirty}
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

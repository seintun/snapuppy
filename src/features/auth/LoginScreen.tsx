import { EmailSchema } from '@/lib/schemas';
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';

const PASSCODE_COOLDOWN_MS = 30_000;
const PASSCODE_COOLDOWN_STORAGE_KEY = 'snapuppy.passcode_next_allowed_at';
const PASSCODE_LENGTH = 6;

function DogIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="dog-bounce"
    >
      <path d="M18 14 L10 38 L28 34 Z" fill="#D4845A" />
      <path d="M20 18 L14 32 L26 29 Z" fill="#F3BA9D" />
      <path d="M62 14 L70 38 L52 34 Z" fill="#D4845A" />
      <path d="M60 18 L66 32 L54 29 Z" fill="#F3BA9D" />
      <circle cx="40" cy="40" r="22" fill="#8FB886" />
      <circle cx="28" cy="46" r="2.5" fill="#F6D7C5" />
      <circle cx="52" cy="46" r="2.5" fill="#F6D7C5" />
      <ellipse cx="40" cy="50" rx="14" ry="10" fill="#FDFBF7" />
      <ellipse cx="30" cy="36" r="3" fill="#4A3728" />
      <ellipse cx="50" cy="36" r="3" fill="#4A3728" />
      <circle cx="31" cy="35" r="1" fill="#FFFFFF" />
      <circle cx="51" cy="35" r="1" fill="#FFFFFF" />
      <ellipse cx="40" cy="46" rx="4.5" ry="3" fill="#4A3728" />
      <path d="M40 48 V50" stroke="#4A3728" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M34 51 Q40 55 46 51"
        stroke="#4A3728"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M37 52 C36 56 38 60 40 60 C42 60 44 56 43 52 Z" fill="#D4845A" />
      <path d="M40 53 V59" stroke="#B9654A" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function PasscodeInput({
  value,
  onChange,
  onSubmit,
  email,
  onChangeEmail,
  isVerifying,
  cooldownSeconds,
  isCoolingDown,
  onResend,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (code: string) => void;
  email: string;
  onChangeEmail: () => void;
  isVerifying: boolean;
  cooldownSeconds: number;
  isCoolingDown: boolean;
  onResend: () => void;
}) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    onChange(digits);
    if (digits.length === PASSCODE_LENGTH) {
      hiddenInputRef.current?.blur();
      onSubmit(digits);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && value.length === PASSCODE_LENGTH) {
      e.preventDefault();
      onSubmit(value);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center py-2">
        <p className="text-sm text-bark-light mb-1">We sent a code to</p>
        <p className="text-lg font-bold text-bark">{email}</p>
        <p className="text-xs text-bark-light mt-1">Enter the 6-digit code</p>
      </div>

      {/* Single hidden input captures full OTP including iOS/Android autofill */}
      <div className="relative flex justify-center gap-2" onClick={() => hiddenInputRef.current?.focus()}>
        <input
          ref={hiddenInputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={PASSCODE_LENGTH}
          className="absolute opacity-0 w-full h-full top-0 left-0 cursor-default"
          aria-label="Enter 6-digit verification code"
        />
        {Array.from({ length: PASSCODE_LENGTH }, (_, i) => (
          <div
            key={i}
            className={`w-11 h-12 flex items-center justify-center text-lg font-bold bg-cream border-2 rounded-xl transition-all select-none ${
              value.length === i
                ? 'border-sage ring-2 ring-sage/20'
                : value[i]
                  ? 'border-sage/40'
                  : 'border-pebble'
            }`}
          >
            {value[i] || ''}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn-sage py-3 text-sm mt-2"
        onClick={() => onSubmit(value)}
        disabled={value.length !== PASSCODE_LENGTH || isVerifying}
      >
        {isVerifying ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className="flex justify-center gap-4 text-sm">
        <button
          type="button"
          className={`font-semibold ${isVerifying ? 'text-bark-light cursor-not-allowed' : 'text-bark-light hover:text-sage'}`}
          onClick={onChangeEmail}
          disabled={isVerifying}
        >
          Change email
        </button>
        <button
          type="button"
          className={`font-semibold ${isCoolingDown || isVerifying ? 'text-bark-light cursor-not-allowed' : 'text-sage hover:underline'}`}
          onClick={() => {
            onChange('');
            hiddenInputRef.current?.focus();
            onResend();
          }}
          disabled={isCoolingDown || isVerifying}
        >
          {isCoolingDown ? `Resend in ${cooldownSeconds}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { user, loading, sendPasscode, verifyPasscode } = useAuthContext();

  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [step, setStep] = useState<'credentials' | 'verify'>('credentials');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const stored = window.localStorage.getItem(PASSCODE_COOLDOWN_STORAGE_KEY);
    const parsed = stored ? Number(stored) : 0;
    if (Number.isFinite(parsed) && parsed > Date.now()) {
      setNextAllowedAt(parsed);
    }
  }, []);

  useEffect(() => {
    if (nextAllowedAt <= now) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [nextAllowedAt, now]);

  const secondsLeft = Math.max(0, Math.ceil((nextAllowedAt - now) / 1000));
  const isCoolingDown = secondsLeft > 0;

  if (!loading && user) {
    return <Navigate to="/calendar" replace />;
  }

  async function handleSendCode() {
    if (isCoolingDown) {
      setAuthError(`Wait ${secondsLeft}s`);
      return;
    }

    setAuthError(null);
    setIsSending(true);

    const emailResult = EmailSchema.safeParse({ email: email.trim() });
    if (!emailResult.success) {
      setAuthError(emailResult.error.issues[0]?.message);
      setIsSending(false);
      return;
    }

    try {
      await sendPasscode(emailResult.data.email);
      setEmail(emailResult.data.email);
      setStep('verify');
      const nextTime = Date.now() + PASSCODE_COOLDOWN_MS;
      setNextAllowedAt(nextTime);
      window.localStorage.setItem(PASSCODE_COOLDOWN_STORAGE_KEY, String(nextTime));
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      if (/rate\s*limit|429/i.test(raw)) {
        const nextTime = Date.now() + PASSCODE_COOLDOWN_MS;
        setNextAllowedAt(nextTime);
        window.localStorage.setItem(PASSCODE_COOLDOWN_STORAGE_KEY, String(nextTime));
        setAuthError('Too many requests. Wait a minute.');
      } else {
        setAuthError('Could not send code. Try again.');
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerify(code?: string) {
    const codeToVerify = code ?? passcode;
    if (codeToVerify.length !== PASSCODE_LENGTH) {
      setAuthError('Enter the 6-digit code');
      return;
    }

    setAuthError(null);
    setIsVerifying(true);

    try {
      await verifyPasscode(email.trim(), codeToVerify);
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      if (/invalid|incorrect/i.test(raw)) {
        setAuthError('Invalid code');
      } else {
        setAuthError('Verification failed');
      }
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-8">
      <div className="text-center mb-6 animate-fade-in">
        <div className="flex justify-center mb-2">
          <DogIcon />
        </div>
        <h1 className="text-[32px] font-extrabold text-bark m-0">Snapuppy</h1>
        <p className="text-sm text-bark-light mt-1">Dog sitter command center</p>
      </div>

      <div className="surface-card w-full max-w-[360px] p-6 rounded-2xl shadow-lg animate-fade-in">
        {step === 'verify' ? (
          <PasscodeInput
            value={passcode}
            onChange={setPasscode}
            onSubmit={handleVerify}
            email={email}
            onChangeEmail={() => {
              setStep('credentials');
              setPasscode('');
            }}
            isVerifying={isVerifying}
            cooldownSeconds={secondsLeft}
            isCoolingDown={isCoolingDown}
            onResend={handleSendCode}
          />
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendCode();
            }}
          >
            <div className="text-center pb-1">
              <h2 className="text-xl font-extrabold text-bark m-0">Sign in with email code</h2>
              <p className="text-sm text-bark-light mt-2">No password needed.</p>
            </div>

            <div className="form-field">
              <label className="form-label text-xs uppercase tracking-wide">Email</label>
              <input
                type="email"
                placeholder="owner@petlover.com"
                className="form-input disabled:opacity-50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={isSending || isCoolingDown}
              />
            </div>

            {authError && (
              <div className="p-3 bg-blush/80 text-terracotta rounded-xl text-sm font-semibold text-center border border-blush">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="btn-sage mt-3 py-4 text-base"
              disabled={isSending || !email}
            >
              {isSending ? 'Sending...' : isCoolingDown ? `Wait ${secondsLeft}s` : 'Send Code'}
            </button>
          </form>
        )}

        {step === 'verify' && authError && (
          <div className="mt-4 p-3 bg-blush/80 text-terracotta rounded-xl text-sm font-semibold text-center border border-blush">
            {authError}
          </div>
        )}
      </div>

      <p className="text-xs text-bark-light mt-4 text-center">For dog sitters</p>
    </div>
  );
}

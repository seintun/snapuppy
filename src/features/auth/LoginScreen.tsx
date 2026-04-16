import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';
import { EmailSchema } from '@/lib/schemas';

const PASSCODE_COOLDOWN_MS = 30_000;
const PASSCODE_COOLDOWN_STORAGE_KEY = 'snapuppy.passcode_next_allowed_at';
const REMEMBER_DEVICE_STORAGE_KEY = 'snapuppy.remember_device';
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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitInput(index: number, digit: string) {
    if (!digit) {
      if (index === value.length - 1) {
        onChange(value.slice(0, -1));
      }
      return;
    }

    const newValue = value.slice(0, index) + digit + value.slice(index + 1);
    const nextValue = newValue.slice(0, PASSCODE_LENGTH);
    onChange(nextValue);

    if (index < PASSCODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      return;
    }

    if (nextValue.length === PASSCODE_LENGTH) {
      verifyButtonRef.current?.focus();
    }
  }

  function handleBulkInput(index: number, digits: string) {
    if (!digits) {
      return;
    }

    const sanitized = digits.replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    if (!sanitized) {
      return;
    }

    const nextValue =
      index === 0 ? sanitized : (value.slice(0, index) + sanitized).slice(0, PASSCODE_LENGTH);
    onChange(nextValue);
    if (nextValue.length === PASSCODE_LENGTH) {
      verifyButtonRef.current?.focus();
      return;
    }

    inputRefs.current[Math.min(nextValue.length - 1, PASSCODE_LENGTH - 1)]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    handleBulkInput(index, pasted);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center py-2">
        <p className="text-sm text-bark-light mb-1">We sent a code to</p>
        <p className="text-lg font-bold text-bark">{email}</p>
        <p className="text-xs text-bark-light mt-1">Enter the 6-digit code</p>
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: PASSCODE_LENGTH }, (_, i) => i).map((i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              if (!digits) {
                handleDigitInput(i, '');
                return;
              }
              if (digits.length > 1) {
                handleBulkInput(i, digits);
                return;
              }
              handleDigitInput(i, digits);
            }}
            onPaste={(e) => handlePaste(i, e)}
            onKeyDown={(e) => {
              handleKeyDown(i, e);
              if (
                e.key === 'Enter' &&
                i === PASSCODE_LENGTH - 1 &&
                value.length === PASSCODE_LENGTH
              ) {
                e.preventDefault();
                onSubmit(value);
              }
            }}
            className="w-11 h-12 text-lg font-bold text-center bg-cream border-2 border-pebble rounded-xl focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20 transition-all"
          />
        ))}
      </div>

      <button
        ref={verifyButtonRef}
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
            inputRefs.current[0]?.focus();
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
  const [rememberDevice, setRememberDevice] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(PASSCODE_COOLDOWN_STORAGE_KEY);
    const parsed = stored ? Number(stored) : 0;
    if (Number.isFinite(parsed) && parsed > Date.now()) {
      setNextAllowedAt(parsed);
    }
  }, []);

  useEffect(() => {
    setRememberDevice(window.localStorage.getItem(REMEMBER_DEVICE_STORAGE_KEY) === 'true');
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

  async function handleVerify() {
    if (passcode.length !== PASSCODE_LENGTH) {
      setAuthError('Enter the 6-digit code');
      return;
    }

    setAuthError(null);
    setIsVerifying(true);

    try {
      await verifyPasscode(email.trim(), passcode);
      if (rememberDevice) {
        window.localStorage.setItem(REMEMBER_DEVICE_STORAGE_KEY, 'true');
      } else {
        window.localStorage.removeItem(REMEMBER_DEVICE_STORAGE_KEY);
      }
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

  function handleBiometric() {
    if (!window.PublicKeyCredential) {
      setAuthError('Biometric auth is not available on this device.');
      return;
    }
    setAuthError('Biometric unlock is available after the first successful login.');
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
                placeholder="you@example.com"
                className="form-input disabled:opacity-50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={isSending || isCoolingDown}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-bark-light">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
              />
              Remember device
            </label>

            <button type="button" className="btn-sage !py-2 text-xs" onClick={handleBiometric}>
              Use Biometric
            </button>

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

import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';
import { EmailSchema, PasswordSchema } from '@/lib/schemas';

const PASSCODE_COOLDOWN_MS = 30_000;
const PASSCODE_COOLDOWN_STORAGE_KEY = 'snapuppy.passcode_next_allowed_at';

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

type AuthAction = 'sign-in' | 'sign-up';

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

  useEffect(() => {
    if (value.length === 6) {
      inputRefs.current[5]?.focus();
    } else if (value.length > 0) {
      inputRefs.current[value.length - 1]?.focus();
    }
  }, [value]);

  function handleDigitInput(index: number, digit: string) {
    const newValue = value.slice(0, index) + digit + value.slice(index + 1);
    onChange(newValue);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center py-2">
        <p className="text-sm text-bark-light mb-1">We sent a code to</p>
        <p className="text-lg font-bold text-bark">{email}</p>
      </div>

      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
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
              const digit = e.target.value.replace(/\D/g, '').slice(-1);
              if (digit) handleDigitInput(i, digit);
            }}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-12 text-lg font-bold text-center bg-cream border-2 border-pebble rounded-xl focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20 transition-all"
          />
        ))}
      </div>

      <button
        type="button"
        className="btn-sage py-3 text-sm mt-2"
        onClick={() => onSubmit(value)}
        disabled={value.length !== 6 || isVerifying}
      >
        {isVerifying ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className="flex justify-center gap-4 text-sm">
        <button
          type="button"
          className="text-bark-light hover:text-sage font-semibold"
          onClick={onChangeEmail}
        >
          ← Change email
        </button>
        <button
          type="button"
          className={`font-semibold ${isCoolingDown ? 'text-bark-light cursor-not-allowed' : 'text-sage hover:underline'}`}
          onClick={onResend}
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

  const [action, setAction] = useState<AuthAction>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (action === 'sign-up') {
      const pwResult = PasswordSchema.safeParse({ password });
      if (!pwResult.success) {
        setAuthError(pwResult.error.issues[0]?.message);
        setIsSending(false);
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match');
        setIsSending(false);
        return;
      }
    }

    try {
      await sendPasscode(emailResult.data.email);
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
    setAuthError(null);
    setIsVerifying(true);

    try {
      await verifyPasscode(email.trim(), passcode);
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
        <div className="flex bg-pebble/40 rounded-2xl p-1.5 mb-6">
          <button
            type="button"
            onClick={() => {
              setAction('sign-in');
              setStep('credentials');
              setAuthError(null);
              setConfirmPassword('');
            }}
            className={`flex-1 py-3.5 text-base font-bold rounded-xl transition-all ${action === 'sign-in' ? 'bg-sage text-white shadow-md' : 'text-bark-light hover:text-bark'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAction('sign-up');
              setStep('credentials');
              setAuthError(null);
              setConfirmPassword('');
            }}
            className={`flex-1 py-3 text-base font-bold rounded-xl transition-all ${action === 'sign-up' ? 'bg-sage text-white shadow-md' : 'text-bark-light hover:text-bark'}`}
          >
            Sign Up
          </button>
        </div>

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
          <div className="flex flex-col gap-4">
            <div className="form-field">
              <label className="form-label text-xs uppercase tracking-wide">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label className="form-label text-xs uppercase tracking-wide">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={action === 'sign-up' ? 'new-password' : 'current-password'}
              />
            </div>

            {action === 'sign-up' && (
              <div className="form-field animate-fade-in">
                <label className="form-label text-xs uppercase tracking-wide">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            )}

            {authError && (
              <div className="p-3 bg-blush/80 text-terracotta rounded-xl text-sm font-semibold text-center border border-blush">
                {authError}
              </div>
            )}

            <button
              type="button"
              className="btn-sage mt-3 py-4 text-base"
              onClick={handleSendCode}
              disabled={
                isSending || !email || !password || (action === 'sign-up' && !confirmPassword)
              }
            >
              {isSending ? 'Sending...' : isCoolingDown ? `Wait ${secondsLeft}s` : 'Send Code'}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-bark-light mt-4 text-center">For dog sitters</p>
    </div>
  );
}

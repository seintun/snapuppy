import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';
import { EmailSchema, PasswordSchema } from '@/lib/schemas';

const MAGIC_LINK_COOLDOWN_MS = 30_000;
const MAGIC_LINK_COOLDOWN_STORAGE_KEY = 'snapuppy.magic_link_next_allowed_at';

function DogIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M24 12 L14 37 L34 34 Z" fill="#D4845A" />
      <path d="M24 18 L19 32 L30 30 Z" fill="#F3BA9D" />
      <ellipse cx="62" cy="42" rx="8" ry="18" transform="rotate(-22 62 42)" fill="#D4845A" />
      <ellipse cx="62" cy="43" rx="4.5" ry="11" transform="rotate(-22 62 43)" fill="#F3BA9D" />
      <circle cx="40" cy="39" r="24" fill="#8FB886" />
      <circle cx="28" cy="46" r="3" fill="#F6D7C5" />
      <circle cx="52" cy="46" r="3" fill="#F6D7C5" />
      <ellipse cx="40" cy="50" rx="15" ry="10.5" fill="#FDFBF7" />
      <ellipse cx="31" cy="36" rx="3.2" ry="3.8" fill="#4A3728" />
      <ellipse cx="49" cy="36" rx="3.2" ry="3.8" fill="#4A3728" />
      <circle cx="32" cy="34.5" r="1.2" fill="#FFFFFF" />
      <circle cx="50" cy="34.5" r="1.2" fill="#FFFFFF" />
      <ellipse cx="40" cy="46" rx="4.8" ry="3.2" fill="#4A3728" />
      <path d="M40 48.5 V51" stroke="#4A3728" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M34 51 Q40 56 46 51"
        stroke="#4A3728"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M37 52 C36 56.5 37.8 61 40 61 C42.2 61 44 56.5 43 52 Z" fill="#D4845A" />
      <path d="M40 52.8 V60" stroke="#B9654A" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

type AuthMode = 'magic-link' | 'password-login' | 'password-signup';

export function LoginScreen() {
  const { user, loading, signIn, signInWithPassword, signUp } = useAuthContext();

  const [authMode, setAuthMode] = useState<AuthMode>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const stored = window.localStorage.getItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY);
    const parsed = stored ? Number(stored) : 0;
    if (Number.isFinite(parsed) && parsed > Date.now()) {
      setNextAllowedAt(parsed);
    }
  }, []);

  useEffect(() => {
    if (nextAllowedAt <= now) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [nextAllowedAt, now]);

  const secondsLeft = Math.max(0, Math.ceil((nextAllowedAt - now) / 1000));
  const isCoolingDown = secondsLeft > 0;

  if (!loading && user) {
    return <Navigate to="/calendar" replace />;
  }

  async function sendMagicLink(emailValue: string) {
    if (isCoolingDown) {
      setAuthError(`Please wait ${secondsLeft}s before requesting another link.`);
      return;
    }

    setIsSending(true);
    setAuthError(null);

    try {
      await signIn(emailValue);
      setSentTo(emailValue);

      const nextTime = Date.now() + MAGIC_LINK_COOLDOWN_MS;
      setNextAllowedAt(nextTime);
      setNow(Date.now());
      window.localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, String(nextTime));
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      const isRateLimit = /rate\s*limit|429|over_email_send_rate_limit/i.test(raw);

      if (isRateLimit) {
        const nextTime = Date.now() + MAGIC_LINK_COOLDOWN_MS;
        setNextAllowedAt(nextTime);
        setNow(Date.now());
        window.localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, String(nextTime));
        setAuthError('Too many requests. Please wait about a minute, then try again.');
      } else {
        setAuthError('Could not send magic link. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = EmailSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setAuthError(result.error.issues[0]?.message ?? 'Invalid email address.');
      return;
    }

    await sendMagicLink(result.data.email);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setIsSending(true);

    if (authMode === 'password-signup') {
      const emailResult = EmailSchema.safeParse({ email: email.trim() });
      if (!emailResult.success) {
        setAuthError(emailResult.error.issues[0]?.message ?? 'Invalid email address.');
        setIsSending(false);
        return;
      }

      const pwResult = PasswordSchema.safeParse({ password });
      if (!pwResult.success) {
        setAuthError(pwResult.error.issues[0]?.message ?? 'Password too weak.');
        setIsSending(false);
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        setIsSending(false);
        return;
      }

      try {
        await signUp(emailResult.data.email, password);
        setAuthError('Check your email to confirm your account, then sign in.');
        setAuthMode('password-login');
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Could not create account.');
      }
    } else {
      const emailResult = EmailSchema.safeParse({ email: email.trim() });
      if (!emailResult.success) {
        setAuthError(emailResult.error.issues[0]?.message ?? 'Invalid email address.');
        setIsSending(false);
        return;
      }

      try {
        await signInWithPassword(emailResult.data.email, password);
      } catch (error) {
        setAuthError('Invalid email or password.');
      }
    }

    setIsSending(false);
  }

  function switchToPasswordLogin() {
    setAuthMode('password-login');
    setAuthError(null);
    setConfirmPassword('');
  }

  function switchToPasswordSignup() {
    setAuthMode('password-signup');
    setAuthError(null);
    setConfirmPassword('');
  }

  function switchToMagicLink() {
    setAuthMode('magic-link');
    setAuthError(null);
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-3">
      <div className="text-center mb-6 animate-in fade-in slide-in-from-bottom-4 duration-400 fill-mode-both">
        <div className="flex items-center justify-center mb-1">
          <DogIcon />
        </div>
        <h1 className="text-[32px] font-extrabold text-bark m-0 font-nunito">Snapuppy</h1>
        <p className="text-base text-bark-light m-0 text-center">Your dog sitting command center</p>
      </div>

      <div className="surface-card w-full max-w-[340px] p-6 animate-in fade-in slide-in-from-bottom-4 duration-400 delay-150 fill-mode-both">
        {sentTo ? (
          <div className="flex flex-col gap-3.5">
            <h2 className="m-0 text-bark text-xl">Check your inbox 🐕</h2>
            <p className="m-0 text-bark-light text-sm leading-relaxed">
              We sent a magic link to <strong className="text-bark">{sentTo}</strong>. Tap it and
              you are in.
            </p>

            <button
              type="button"
              className="btn-sage min-h-[46px]"
              onClick={() => {
                setSentTo(null);
                setAuthError(null);
              }}
            >
              Send to a different email
            </button>

            <button
              type="button"
              className="btn-secondary min-h-[44px] font-bold"
              onClick={() => void sendMagicLink(sentTo)}
              disabled={isSending || isCoolingDown}
            >
              {isSending
                ? 'Sending...'
                : isCoolingDown
                  ? `Resend in ${secondsLeft}s`
                  : 'Resend magic link'}
            </button>
          </div>
        ) : authMode === 'magic-link' ? (
          <form className="flex flex-col gap-4" onSubmit={handleMagicLinkSubmit}>
            <h2 className="m-0 text-xl text-bark">Start in 10 seconds</h2>
            <p className="m-0 text-bark-light text-sm leading-relaxed">
              No password. No setup headaches. Just your email and done.
            </p>

            <div className="form-field">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="form-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {authError && (
              <div className="p-2 px-3 bg-blush text-terracotta rounded-lg text-[13px] font-semibold">
                {authError}
              </div>
            )}

            <button type="submit" className="btn-sage mt-2" disabled={isSending || isCoolingDown}>
              {isSending
                ? 'Sending your link...'
                : isCoolingDown
                  ? `Try again in ${secondsLeft}s`
                  : 'Send me a magic link 🐾'}
            </button>

            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-bark-light">Or</span>
              <button
                type="button"
                className="text-xs text-sage font-bold hover:underline"
                onClick={switchToPasswordLogin}
              >
                Sign in with password
              </button>
            </div>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
            <h2 className="m-0 text-xl text-bark">
              {authMode === 'password-signup' ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="m-0 text-bark-light text-sm leading-relaxed">
              {authMode === 'password-signup'
                ? 'Choose a password to get started.'
                : 'Enter your credentials to sign in.'}
            </p>

            <div className="form-field">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="form-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="form-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={authMode === 'password-signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {authMode === 'password-signup' && (
              <div className="form-field">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  className="form-input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}

            {authError && (
              <div className="p-2 px-3 bg-blush text-terracotta rounded-lg text-[13px] font-semibold">
                {authError}
              </div>
            )}

            <button type="submit" className="btn-sage mt-2" disabled={isSending}>
              {isSending
                ? 'Please wait...'
                : authMode === 'password-signup'
                  ? 'Create account'
                  : 'Sign in'}
            </button>

            <div className="flex items-center justify-center gap-2 mt-2">
              {authMode === 'password-signup' ? (
                <>
                  <span className="text-xs text-bark-light">Already have an account?</span>
                  <button
                    type="button"
                    className="text-xs text-sage font-bold hover:underline"
                    onClick={switchToPasswordLogin}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-bark-light">Or</span>
                  <button
                    type="button"
                    className="text-xs text-sage font-bold hover:underline"
                    onClick={switchToMagicLink}
                  >
                    Use magic link
                  </button>
                </>
              )}
            </div>

            {authMode === 'password-login' && (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  className="text-xs text-sage font-bold hover:underline"
                  onClick={switchToPasswordSignup}
                >
                  No account? Create one
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      <p className="text-xs text-bark-light m-0 mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-400 delay-300 fill-mode-both">
        For professional dog sitters
      </p>
    </div>
  );
}

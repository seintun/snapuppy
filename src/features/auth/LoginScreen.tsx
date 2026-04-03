import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';

const MAGIC_LINK_COOLDOWN_MS = 60_000;
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
      {/* One ear up */}
      <path d="M24 12 L14 37 L34 34 Z" fill="#D4845A" />
      <path d="M24 18 L19 32 L30 30 Z" fill="#F3BA9D" />

      {/* One floppy ear */}
      <ellipse cx="62" cy="42" rx="8" ry="18" transform="rotate(-22 62 42)" fill="#D4845A" />
      <ellipse cx="62" cy="43" rx="4.5" ry="11" transform="rotate(-22 62 43)" fill="#F3BA9D" />

      {/* Head */}
      <circle cx="40" cy="39" r="24" fill="#8FB886" />

      {/* Cheeks */}
      <circle cx="28" cy="46" r="3" fill="#F6D7C5" />
      <circle cx="52" cy="46" r="3" fill="#F6D7C5" />

      {/* Muzzle */}
      <ellipse cx="40" cy="50" rx="15" ry="10.5" fill="#FDFBF7" />

      {/* Eyes */}
      <ellipse cx="31" cy="36" rx="3.2" ry="3.8" fill="#4A3728" />
      <ellipse cx="49" cy="36" rx="3.2" ry="3.8" fill="#4A3728" />
      <circle cx="32" cy="34.5" r="1.2" fill="#FFFFFF" />
      <circle cx="50" cy="34.5" r="1.2" fill="#FFFFFF" />

      {/* Nose */}
      <ellipse cx="40" cy="46" rx="4.8" ry="3.2" fill="#4A3728" />

      {/* Smile and tongue out */}
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

export function LoginScreen() {
  const { user, loading, signIn } = useAuthContext();

  const [email, setEmail] = useState('');
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
      const message = error instanceof Error ? error.message : 'Failed to send magic link.';
      const isRateLimit = /rate\s*limit|429/i.test(message);

      if (isRateLimit) {
        const nextTime = Date.now() + MAGIC_LINK_COOLDOWN_MS;
        setNextAllowedAt(nextTime);
        setNow(Date.now());
        window.localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, String(nextTime));
        setAuthError('Too many requests. Please wait about a minute, then try again.');
      } else {
        setAuthError(message);
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setAuthError('Please enter an email address.');
      return;
    }

    await sendMagicLink(normalizedEmail);
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
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
          </form>
        )}
      </div>

      <p className="text-xs text-bark-light m-0 mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-400 delay-300 fill-mode-both">
        For professional dog sitters
      </p>
    </div>
  );
}

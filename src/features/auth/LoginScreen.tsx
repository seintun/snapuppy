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
      {/* Ears */}
      <ellipse cx="18" cy="45" rx="8.5" ry="20" transform="rotate(20 18 45)" fill="#D4845A" />
      <ellipse cx="62" cy="45" rx="8.5" ry="20" transform="rotate(-20 62 45)" fill="#D4845A" />
      
      {/* Head */}
      <circle cx="40" cy="38" r="25" fill="#8FB886" />
      
      {/* Muzzle */}
      <ellipse cx="40" cy="48" rx="15" ry="11" fill="#FDFBF7" />
      
      {/* Eyes */}
      <circle cx="30" cy="34" r="3.5" fill="#4A3728" />
      <circle cx="50" cy="34" r="3.5" fill="#4A3728" />
      <circle cx="31" cy="32.5" r="1.5" fill="#FFFFFF" />
      <circle cx="51" cy="32.5" r="1.5" fill="#FFFFFF" />
      
      {/* Nose */}
      <ellipse cx="40" cy="44" rx="5" ry="3.5" fill="#4A3728" />
      
      {/* Tongue */}
      <path d="M37 50.5 V56 C37 59 43 59 43 56 V50.5 Z" fill="#D4845A" />
      
      {/* Line from nose to mouth */}
      <path d="M40 47 V50" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" />
      
      {/* Mouth */}
      <path d="M34 49 Q40 54 46 49" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" fill="none" />
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

import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';

function PawIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="40" cy="50" rx="18" ry="22" fill="#8fb886" />
      <ellipse cx="22" cy="32" rx="9" ry="11" fill="#8fb886" />
      <ellipse cx="58" cy="32" rx="9" ry="11" fill="#8fb886" />
      <ellipse cx="14" cy="46" rx="7.5" ry="9.5" fill="#8fb886" />
      <ellipse cx="66" cy="46" rx="7.5" ry="9.5" fill="#8fb886" />
    </svg>
  );
}

export function LoginScreen() {
  const { user, loading, signIn } = useAuthContext();

  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!loading && user) {
    return <Navigate to="/calendar" replace />;
  }

  async function sendMagicLink(emailValue: string) {
    setIsSending(true);
    setAuthError(null);

    try {
      await signIn(emailValue);
      setSentTo(emailValue);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to send magic link.');
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
    <div className="login-screen">
      <div
        style={{
          textAlign: 'center',
          marginBottom: 24,
          animation: 'stagger-fade-in 400ms ease-out both',
        }}
      >
        <div className="login-logo">
          <PawIcon />
        </div>
        <h1 className="login-title">Snapuppy</h1>
        <p className="login-tagline">Your dog sitting command center</p>
      </div>

      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: 340,
          padding: '24px',
          animation: 'stagger-fade-in 400ms 160ms ease-out both',
        }}
      >
        {sentTo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ margin: 0, color: 'var(--bark)', fontSize: 20 }}>Check your inbox 🐕</h2>
            <p style={{ margin: 0, color: 'var(--bark-light)', fontSize: 14, lineHeight: 1.4 }}>
              We sent a magic link to <strong style={{ color: 'var(--bark)' }}>{sentTo}</strong>.
              Tap it and you are in.
            </p>

            <button
              type="button"
              className="btn-sage"
              style={{ minHeight: 46 }}
              onClick={() => {
                setSentTo(null);
                setAuthError(null);
              }}
            >
              Send to a different email
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 44, fontWeight: 700 }}
              onClick={() => void sendMagicLink(sentTo)}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : 'Resend magic link'}
            </button>
          </div>
        ) : (
          <form
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            onSubmit={handleSubmit}
          >
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--bark)' }}>Start in 10 seconds</h2>
            <p style={{ margin: 0, color: 'var(--bark-light)', fontSize: 14, lineHeight: 1.4 }}>
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
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--blush)',
                  color: '#7b2f1c',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="btn-sage"
              disabled={isSending}
              style={{ marginTop: 8 }}
            >
              {isSending ? 'Sending your link...' : 'Send me a magic link 🐾'}
            </button>
          </form>
        )}
      </div>

      <p
        className="login-footer"
        style={{ animation: 'stagger-fade-in 400ms 320ms ease-out both', marginTop: 24 }}
      >
        For professional dog sitters
      </p>
    </div>
  );
}

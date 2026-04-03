import { useState } from 'react';
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

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.79h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.98-4.32 2.98-7.31z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.97-.9 6.62-2.44l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H1.08v2.58A10 10 0 0 0 10 20z"
        fill="#34A853"
      />
      <path
        d="M4.4 11.9A6.03 6.03 0 0 1 4.08 10c0-.66.12-1.3.32-1.9V5.52H1.08A10 10 0 0 0 0 10c0 1.61.39 3.13 1.08 4.48L4.4 11.9z"
        fill="#FBBC05"
      />
      <path
        d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.94 9.94 0 0 0 10 0 10 10 0 0 0 1.08 5.52L4.4 8.1C5.19 5.74 7.4 3.98 10 3.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginScreen() {
  const { signIn, signInWithPassword, signUpWithPassword } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [authMode, setAuthMode] = useState<'select' | 'email-signin' | 'email-signup'>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  async function handleSignIn() {
    setIsSigningIn(true);
    try {
      await signIn();
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleEmailSignIn() {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleEmailSignUp() {
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await signUpWithPassword(email, password);
      setAuthError('Check your email to confirm your account');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsAuthLoading(false);
    }
  }

  if (authMode !== 'select') {
    return (
      <div className="login-screen">
        <div className="login-logo">
          <PawIcon />
        </div>
        <h1 className="login-title">Snapuppy</h1>
        <div style={{ width: '100%', maxWidth: 320, marginTop: 16, padding: '0 16px' }}>
          <h2 style={{ marginBottom: 16, fontSize: 18 }}>
            {authMode === 'email-signin' ? 'Sign in with email' : 'Create account'}
          </h2>
          <div className="form-field">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {authMode === 'email-signup' && (
            <div className="form-field">
              <label className="form-label" htmlFor="confirm-password">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}
          {authError && (
            <p style={{ color: 'var(--terracotta)', fontSize: 14, marginTop: 8 }}>{authError}</p>
          )}
          <button
            className="btn-sage"
            onClick={() =>
              void (authMode === 'email-signin' ? handleEmailSignIn() : handleEmailSignUp())
            }
            disabled={isAuthLoading}
            style={{ marginTop: 16, width: '100%' }}
          >
            {isAuthLoading
              ? 'Loading...'
              : authMode === 'email-signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setAuthMode('select')}
            style={{ marginTop: 12, width: '100%' }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-logo" style={{ animation: 'stagger-fade-in 400ms ease-out both' }}>
        <PawIcon />
      </div>

      <h1 className="login-title" style={{ animation: 'stagger-fade-in 400ms 80ms ease-out both' }}>
        Snapuppy
      </h1>

      <p
        className="login-tagline"
        style={{ animation: 'stagger-fade-in 400ms 160ms ease-out both' }}
      >
        Your dog sitting command center
      </p>

      <div
        style={{
          width: '100%',
          maxWidth: 320,
          marginTop: 16,
          animation: 'stagger-fade-in 400ms 240ms ease-out both',
        }}
      >
        <button
          className="btn-google"
          onClick={() => void handleSignIn()}
          disabled={isSigningIn}
          aria-label="Sign in with Google"
        >
          <GoogleIcon />
          {isSigningIn ? 'Connecting…' : 'Continue with Google'}
        </button>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => setAuthMode('email-signin')}
            style={{ minHeight: 44 }}
          >
            Sign in with email
          </button>
          <button
            className="btn-secondary"
            onClick={() => setAuthMode('email-signup')}
            style={{ minHeight: 44 }}
          >
            Create account
          </button>
        </div>
      </div>

      <p
        className="login-footer"
        style={{ animation: 'stagger-fade-in 400ms 320ms ease-out both' }}
      >
        For professional dog sitters
      </p>
    </div>
  );
}

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
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
  const { signIn } = useAuthContext();

  return (
    <div className="login-screen">
      <div className="login-logo" style={{ animation: 'stagger-fade-in 400ms ease-out both' }}>
        <PawIcon />
      </div>

      <h1
        className="login-title"
        style={{ animation: 'stagger-fade-in 400ms 80ms ease-out both' }}
      >
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
          onClick={signIn}
          aria-label="Sign in with Google"
        >
          <GoogleIcon />
          Continue with Google
        </button>
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

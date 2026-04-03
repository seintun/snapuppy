import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Handles the OAuth redirect from Supabase after Google sign-in.
 *
 * When running as a PWA, sign-in opens in a new browser tab to avoid
 * Google's webview rejection (Error 403: app_domain). After Supabase
 * processes the callback and sets the session, this page closes the tab.
 * The PWA window detects the new session via onAuthStateChange automatically.
 *
 * In a normal browser tab flow (fallback), it navigates to the app root.
 */
export function AuthCallbackScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically exchanges the code in the URL for a session.
    // We just wait for the session to be confirmed, then clean up.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe();

        // If this is a popup/new tab opened by the PWA, close it.
        // The PWA window will detect the session change on its own.
        if (window.opener) {
          window.close();
        } else {
          // Normal browser flow — redirect into the app.
          navigate('/', { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'var(--font-sans, system-ui)',
        color: 'var(--bark, #3b3228)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid #d4cfc9',
          borderTopColor: '#8fb886',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: 15 }}>Signing you in…</p>
    </div>
  );
}

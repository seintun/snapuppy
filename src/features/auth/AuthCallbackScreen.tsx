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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 font-sans text-bark">
      <div className="w-9 h-9 border-3 border-[#d4cfc9] border-t-[#8fb886] rounded-full animate-spin" />
      <p className="m-0 text-[15px]">Signing you in…</p>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function AuthCallbackScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        navigate('/calendar', { replace: true });
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) {
        navigate('/calendar', { replace: true });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 font-sans text-bark">
      <div className="w-9 h-9 border-3 border-[#d4cfc9] border-t-[#8fb886] rounded-full animate-spin" />
      <p className="m-0 text-[15px]">Confirming your magic link…</p>
    </div>
  );
}

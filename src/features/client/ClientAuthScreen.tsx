import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { validateClientToken } from '@/lib/clientToken';
import { verifyClientCredentials } from '@/lib/clientService';
import { setClientSession, getClientSession } from './clientAuth';
import { PawPrint } from '@phosphor-icons/react';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

function DogIcon() {
  return (
    <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export function ClientAuthScreen() {
  const { token } = useParams<{ token: string }>();
  const [sitterProfile, setSitterProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const existingSession = getClientSession();
  if (existingSession && existingSession.sitterToken === token) {
    return <Navigate to="/client/dashboard" replace />;
  }

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }

    validateClientToken(token)
      .then((profile) => {
        if (!profile) {
          setError('This link has expired. Please ask your sitter for a new one.');
        } else {
          setSitterProfile(profile);
        }
      })
      .catch(() => {
        setError('Invalid link');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleVerify = useCallback(async () => {
    if (!sitterProfile || !clientName.trim() || !clientPhone.trim()) return;

    setVerifying(true);
    setVerifyError(null);

    try {
      const result = await verifyClientCredentials(
        sitterProfile.id,
        clientName.trim(),
        clientPhone.trim(),
      );

      if (!result) {
        setVerifyError('Name or phone number does not match our records.');
        return;
      }

      setClientSession({
        sitterId: sitterProfile.id,
        sitterToken: token!,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        dogId: result.dog.id,
        dogName: result.dog.name,
      });

      window.location.href = '/client/dashboard';
    } catch (err) {
      setVerifyError('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, [sitterProfile, clientName, clientPhone, token]);

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-8 bg-warm-beige">
        <div className="text-center">
          <PawPrint size={48} className="text-sage animate-pulse mx-auto mb-4" />
          <p className="text-bark-light text-sm">Verifying link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-8 bg-warm-beige">
        <div className="text-center">
          <DogIcon />
          <h1 className="text-xl font-black text-bark mt-4 mb-2">Oops!</h1>
          <p className="text-bark-light text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-8 bg-warm-beige">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <DogIcon />
        </div>
        <h1 className="text-2xl font-black text-bark">
          {sitterProfile?.business_name || 'Your Sitter'}
        </h1>
        <p className="text-sm text-bark-light mt-1">Client Portal</p>
      </div>

      <div className="surface-card w-full max-w-[360px] p-6 rounded-2xl shadow-lg">
        <h2 className="text-lg font-bold text-bark mb-4">Verify Your Identity</h2>

        <div className="flex flex-col gap-4">
          <div className="form-field">
            <label className="form-label text-xs uppercase tracking-wide">Your Name</label>
            <input
              type="text"
              placeholder="First name"
              className="form-input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="form-field">
            <label className="form-label text-xs uppercase tracking-wide">Phone Number</label>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              className="form-input"
              value={clientPhone}
              onChange={(e) => {
                const input = e.target as HTMLInputElement;
                let val = input.value.replace(/\D/g, '');
                if (val.length > 10) val = val.slice(0, 10);

                let formatted = '';
                if (val.length > 0) {
                  if (val.length <= 3) formatted = `(${val}`;
                  else if (val.length <= 6) formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                  else formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                }
                input.value = formatted;
                setClientPhone(formatted);
              }}
              autoComplete="tel"
            />
          </div>

          {verifyError && (
            <div className="p-3 bg-blush/80 text-terracotta rounded-xl text-sm font-semibold text-center border border-blush">
              {verifyError}
            </div>
          )}

          <button
            type="button"
            className="btn-sage mt-2 py-3"
            onClick={handleVerify}
            disabled={verifying || !clientName.trim() || !clientPhone.trim()}
          >
            {verifying ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </div>

      <p className="text-xs text-bark-light mt-4 text-center">
        Enter the name and phone number on file with your sitter
      </p>
    </div>
  );
}

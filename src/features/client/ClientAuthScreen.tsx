import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { validateToken } from '@/lib/clientToken';
import { verifyClientCredentials } from '@/lib/clientService';
import { setClientSession } from './clientAuth';

export function ClientAuthScreen() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const tokenData = await validateToken(token);
      if (!tokenData) {
        setError('Invalid or expired invite link.');
        return;
      }

      const dog = await verifyClientCredentials({
        sitterId: tokenData.sitterId,
        ownerName,
        ownerPhone,
      });

      if (!dog) {
        setError('Could not verify your details. Check name and phone number.');
        return;
      }

      setClientSession({
        token,
        sitterId: tokenData.sitterId,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
      });

      navigate(`/client/${token}/dashboard`, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-warm-beige px-4 py-8">
      <div className="max-w-md mx-auto surface-card p-5">
        <h1 className="text-xl font-black text-bark">Client Portal</h1>
        <p className="text-sm text-bark-light mt-1">Enter your details to view bookings.</p>
        <form className="space-y-3 mt-4" onSubmit={handleSubmit}>
          <label className="form-label">
            Your name
            <input
              className="form-input mt-1"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              required
            />
          </label>
          <label className="form-label">
            Phone number
            <input
              className="form-input mt-1"
              value={ownerPhone}
              onChange={(event) => setOwnerPhone(event.target.value)}
              required
              inputMode="tel"
            />
          </label>
          {error ? <p className="text-xs text-terracotta">{error}</p> : null}
          <button type="submit" className="btn-sage w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

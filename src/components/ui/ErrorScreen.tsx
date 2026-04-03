import { Warning, House, ArrowClockwise } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

interface ErrorScreenProps {
  error: Error | null;
  reset?: () => void;
}

export function ErrorScreen({ error, reset }: ErrorScreenProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (reset) reset();
    navigate('/');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
      background: 'var(--cream)',
      color: 'var(--bark)'
    }}>
      <div style={{
        background: 'var(--blush)',
        color: 'var(--terracotta)',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <Warning size={32} weight="bold" />
      </div>

      <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-0.02em' }}>
        Oops! Something went wrong
      </h1>
      
      <p style={{ color: 'var(--bark-light)', fontSize: '15px', maxWidth: '300px', marginBottom: '32px', lineHeight: '1.5' }}>
        {error?.message || "An unexpected error occurred. Don't worry, the pups are safe!"}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '240px' }}>
        <button 
          onClick={handleReload}
          className="btn-sage"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <ArrowClockwise size={20} weight="bold" />
          Try Again
        </button>

        <button 
          onClick={handleGoHome}
          className="btn-outline"
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            background: 'white',
            border: '1.5px solid var(--pebble)',
            color: 'var(--bark)',
            padding: '12px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '15px'
          }}
        >
          <House size={20} weight="bold" />
          Back to Home
        </button>
      </div>

      {import.meta.env.DEV && error && (
        <div style={{
          marginTop: '40px',
          padding: '16px',
          background: 'rgba(0,0,0,0.05)',
          borderRadius: '12px',
          fontSize: '11px',
          textAlign: 'left',
          width: '100%',
          maxWidth: '400px',
          overflowX: 'auto',
          fontFamily: 'monospace',
          color: 'var(--bark-light)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Debug Info:</p>
          <pre>{error.stack}</pre>
        </div>
      )}
    </div>
  );
}

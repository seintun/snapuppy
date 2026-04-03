import { useContext } from 'react';
import type { AuthState } from '@/hooks/useAuth';
import { AuthContext } from './AuthContext';

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

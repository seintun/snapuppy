const CLIENT_SESSION_KEY = 'snapuppy_client_session';
const SESSION_DURATION_DAYS = 7;

export interface ClientSession {
  sitterId: string;
  sitterToken: string;
  clientName: string;
  clientPhone: string;
  dogId: string;
  dogName: string;
  expiresAt: string;
}

export function setClientSession(session: Omit<ClientSession, 'expiresAt'>): void {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const fullSession: ClientSession = {
    ...session,
    expiresAt: expiresAt.toISOString(),
  };

  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(fullSession));
}

export function getClientSession(): ClientSession | null {
  const stored = localStorage.getItem(CLIENT_SESSION_KEY);
  if (!stored) return null;

  try {
    const session: ClientSession = JSON.parse(stored);

    if (new Date(session.expiresAt) < new Date()) {
      clearClientSession();
      return null;
    }

    return session;
  } catch {
    clearClientSession();
    return null;
  }
}

export function clearClientSession(): void {
  localStorage.removeItem(CLIENT_SESSION_KEY);
}

export function isClientAuthenticated(): boolean {
  return getClientSession() !== null;
}

export function getClientSessionSitterToken(): string | null {
  const session = getClientSession();
  return session?.sitterToken ?? null;
}

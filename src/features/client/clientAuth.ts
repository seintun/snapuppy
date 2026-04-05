interface ClientSession {
  token: string;
  sitterId: string;
  ownerName: string;
  ownerPhone: string;
  expiresAt: string;
}

const CLIENT_SESSION_KEY = 'snapuppy:client-session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function setClientSession(input: {
  token: string;
  sitterId: string;
  ownerName: string;
  ownerPhone: string;
}) {
  const session: ClientSession = {
    ...input,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session));
}

export function getClientSession(): ClientSession | null {
  const raw = localStorage.getItem(CLIENT_SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as ClientSession;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(CLIENT_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(CLIENT_SESSION_KEY);
    return null;
  }
}

export function clearClientSession() {
  localStorage.removeItem(CLIENT_SESSION_KEY);
}

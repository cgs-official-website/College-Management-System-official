import * as Keychain from 'react-native-keychain';
import type { AuthSession, Role } from '../types/auth';

const SERVICE = 'zuna.session';

let cache: AuthSession | null = null;
let loaded = false;

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** Reads the session from the secure keychain once, then serves it from memory. */
export const loadSession = async (): Promise<AuthSession | null> => {
  if (loaded) return cache;
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    cache = creds ? (JSON.parse(creds.password) as AuthSession) : null;
  } catch {
    cache = null;
  }
  loaded = true;
  return cache;
};

export const getSession = (): AuthSession | null => cache;

export const storeSession = async (
  role: Role | string | undefined,
  accessToken?: string | null,
  refreshToken?: string | null,
): Promise<void> => {
  if (!role) return;
  const normalized = String(role).trim().toLowerCase() as Role;
  const prev = cache && cache.role === normalized ? cache : null;
  cache = {
    role: normalized,
    accessToken: accessToken || prev?.accessToken || '',
    refreshToken: refreshToken || prev?.refreshToken || null,
  };
  loaded = true;
  try {
    await Keychain.setGenericPassword('session', JSON.stringify(cache), { service: SERVICE });
  } catch (e) {
    console.warn('[session] could not persist session', e);
  }
};

export const clearSession = async (): Promise<void> => {
  cache = null;
  loaded = true;
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // ignore
  }
};

/** Subscribe to "session expired" (refresh failed). Returns an unsubscribe function. */
export const onAuthExpired = (listener: Listener): (() => void) => {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
};

export const emitAuthExpired = (): void => {
  expiredListeners.forEach((l) => l());
};

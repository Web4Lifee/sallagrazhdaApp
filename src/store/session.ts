import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { ApiError, api, configureApi, type User } from '@/lib/api';
import { SERVER_URL, clearToken, loadToken, saveToken, takeLegacyServerUrl } from '@/lib/credentials';
import { notify } from '@/lib/platform';
import { useStore } from '@/store/useStore';

const USER_KEY = 'session-user';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  /** The built-in server address (shown in Settings). */
  serverUrl: string;
  /** Reads the saved login on app start. */
  init: () => Promise<void>;
  /**
   * Logs in, then runs `prepare` (first download / upload of data) before the app opens.
   * If anything fails, nothing is saved and the user stays on the login screen.
   */
  signIn: (username: string, password: string, prepare: () => Promise<void>) => Promise<void>;
  /** Ends the session on this phone and forgets the cached data. */
  signOut: (options?: { expired?: boolean }) => Promise<void>;
};

let signingOut = false;

/**
 * The phone stays signed in until the user logs out: the token is kept in secure storage, the app
 * opens on it right away (also offline), and the server keeps the session alive while it is used.
 * Only a 401 from the server (logged out elsewhere, password changed) signs the phone out.
 */
export const useSession = create<SessionState>()((set, get) => ({
  status: 'loading',
  user: null,
  serverUrl: SERVER_URL ?? '',

  init: async () => {
    const [legacyServer, savedToken, savedUser] = await Promise.all([
      takeLegacyServerUrl(),
      loadToken().catch(() => null),
      AsyncStorage.getItem(USER_KEY),
    ]);
    let token = savedToken;
    let userJson = savedUser;
    if (token && legacyServer !== null && legacyServer !== SERVER_URL) {
      // Signed in to another server (e.g. a local development one): that login and its cached data don't apply here.
      await Promise.all([clearToken().catch(() => undefined), AsyncStorage.removeItem(USER_KEY)]);
      useStore.getState().clear();
      token = null;
      userJson = null;
    }
    configureApi({
      baseUrl: SERVER_URL ?? '',
      token,
      onUnauthorized: () => void get().signOut({ expired: true }),
    });
    // With a saved token the app opens right away on the cached data (also offline);
    // the first sync checks the token and signs out if the server rejects it.
    set({
      status: token && SERVER_URL ? 'signedIn' : 'signedOut',
      user: userJson ? (JSON.parse(userJson) as User) : null,
    });
  },

  signIn: async (username, password, prepare) => {
    if (!SERVER_URL) throw new ApiError(0, 'NO_SERVER', 'No server address');
    if (!(await api.ping(SERVER_URL))) throw new ApiError(0, 'NOT_OUR_SERVER', 'Not a sallagrazhda server');
    configureApi({ baseUrl: SERVER_URL, token: null });
    const { token, user } = await api.login(username, password);
    configureApi({ token });
    try {
      await prepare();
    } catch (error) {
      await api.logout().catch(() => undefined);
      configureApi({ token: null });
      throw error;
    }
    await Promise.all([saveToken(token), AsyncStorage.setItem(USER_KEY, JSON.stringify(user))]);
    set({ status: 'signedIn', user });
  },

  signOut: async ({ expired = false } = {}) => {
    if (signingOut || get().status !== 'signedIn') return;
    signingOut = true;
    try {
      // Tell the server in the background (the request already carries the token), so signing out
      // is instant even when the server is slow or can't be reached.
      if (!expired) void api.logout().catch(() => undefined);
      configureApi({ token: null });
      await Promise.all([clearToken().catch(() => undefined), AsyncStorage.removeItem(USER_KEY)]);
      useStore.getState().clear();
      set({ status: 'signedOut', user: null });
      if (expired) notify('Sesioni ka skaduar', 'Hyni përsëri në llogari.');
    } finally {
      signingOut = false;
    }
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { ApiError, api, configureApi, type User } from '@/lib/api';
import { clearToken, loadServerUrl, loadToken, saveServerUrl, saveToken } from '@/lib/credentials';
import { notify } from '@/lib/platform';
import { useStore } from '@/store/useStore';

const USER_KEY = 'session-user';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  serverUrl: string;
  /** Reads the saved login on app start. */
  init: () => Promise<void>;
  /**
   * Logs in, then runs `prepare` (first download / upload of data) before the app opens.
   * If anything fails, nothing is saved and the user stays on the login screen.
   */
  signIn: (serverUrl: string, username: string, password: string, prepare: () => Promise<void>) => Promise<void>;
  /** Ends the session on this phone and forgets the cached data. */
  signOut: (options?: { expired?: boolean }) => Promise<void>;
};

let signingOut = false;

export const useSession = create<SessionState>()((set, get) => ({
  status: 'loading',
  user: null,
  serverUrl: '',

  init: async () => {
    const [serverUrl, token, userJson] = await Promise.all([
      loadServerUrl(),
      loadToken().catch(() => null),
      AsyncStorage.getItem(USER_KEY),
    ]);
    configureApi({
      baseUrl: serverUrl,
      token,
      onUnauthorized: () => void get().signOut({ expired: true }),
    });
    // With a saved token the app opens right away on the cached data (also offline);
    // the first sync checks the token and signs out if the server rejects it.
    set({
      serverUrl,
      status: token && serverUrl ? 'signedIn' : 'signedOut',
      user: userJson ? (JSON.parse(userJson) as User) : null,
    });
  },

  signIn: async (serverUrl, username, password, prepare) => {
    if (!(await api.ping(serverUrl))) throw new ApiError(0, 'NOT_OUR_SERVER', 'Not a sallagrazhda server');
    configureApi({ baseUrl: serverUrl, token: null });
    const { token, user } = await api.login(username, password);
    configureApi({ token });
    try {
      await prepare();
    } catch (error) {
      await api.logout().catch(() => undefined);
      configureApi({ token: null });
      throw error;
    }
    await Promise.all([saveToken(token), saveServerUrl(serverUrl), AsyncStorage.setItem(USER_KEY, JSON.stringify(user))]);
    set({ status: 'signedIn', user, serverUrl });
  },

  signOut: async ({ expired = false } = {}) => {
    if (signingOut || get().status !== 'signedIn') return;
    signingOut = true;
    try {
      if (!expired) await api.logout().catch(() => undefined);
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

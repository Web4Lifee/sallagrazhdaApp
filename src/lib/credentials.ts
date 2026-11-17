import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'session-token';
/** Older versions saved a server address chosen on the login screen under this key. */
const LEGACY_SERVER_KEY = 'server-url';

/**
 * The login token lives in the phone's secure storage (Keychain / Android Keystore), never in
 * plain AsyncStorage. The web build (used for development) has no secure storage, so it falls
 * back to the browser's session storage, which is cleared when the tab closes.
 */
export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.sessionStorage?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Returns the server address an older version saved (once), and forgets it. */
export async function takeLegacyServerUrl(): Promise<string | null> {
  const saved = await AsyncStorage.getItem(LEGACY_SERVER_KEY);
  if (saved !== null) await AsyncStorage.removeItem(LEGACY_SERVER_KEY);
  return saved;
}

export function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * On a phone, "localhost" is the phone itself. During development (Expo Go / dev build) the app
 * knows the computer it was loaded from (the Metro server, e.g. "192.168.1.20:8081"), so a
 * localhost server address is pointed at that computer instead. Never applies to release builds or web.
 */
export function devMachineHost(): string | null {
  if (!__DEV__ || Platform.OS === 'web') return null;
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host && !isLocalhost(host) ? host : null;
}

/**
 * Cleans up a server address. Returns null when it is not usable.
 * Release builds only accept https://, so passwords and data are never sent unencrypted.
 */
export function normalizeServerUrl(input: string): string | null {
  let value = input.trim().replace(/\/+$/, '');
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) return null;
    const devHost = isLocalhost(url.hostname) ? devMachineHost() : null;
    if (devHost) url.hostname = devHost;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * The server the app talks to: EXPO_PUBLIC_API_URL from .env (or .env.local for a local backend),
 * built into the app. Null when it is missing or, in a release build, not https://.
 */
export const SERVER_URL = normalizeServerUrl(process.env.EXPO_PUBLIC_API_URL ?? '');

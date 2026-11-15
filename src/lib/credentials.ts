import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'session-token';
const SERVER_KEY = 'server-url';

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

/** Server address baked into the build (EXPO_PUBLIC_API_URL), e.g. https://api.example.com */
export const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/** The server address is not secret, so it is kept in AsyncStorage. */
export async function loadServerUrl(): Promise<string> {
  return (await AsyncStorage.getItem(SERVER_KEY)) ?? DEFAULT_SERVER_URL;
}

export async function saveServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_KEY, url);
}

/**
 * Cleans up a typed server address. Returns null when it is not usable.
 * Release builds only accept https://, so passwords and data are never sent unencrypted.
 */
export function normalizeServerUrl(input: string): string | null {
  let value = input.trim().replace(/\/+$/, '');
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

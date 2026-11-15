import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import regularSymbols from 'expo-symbols/androidWeights/regular';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { colors } from '@/constants/theme';
import { useHydrated, useStore } from '@/store/useStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useHydrated();
  // Preload the Material Symbols font on Android/web so icons don't pop in.
  const [fontsLoaded, fontError] = useFonts(
    Platform.OS === 'ios' ? {} : { [regularSymbols.name]: regularSymbols.font },
  );
  const ready = hydrated && (fontsLoaded || !!fontError);

  // Start the next season automatically once its month arrives: checked on launch and whenever
  // the app comes back to the foreground. (It can also be started manually from Settings.)
  useEffect(() => {
    if (!hydrated) return;
    const store = useStore.getState();
    store.startDueSeasons();
    store.ensureAnnualTickets();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') useStore.getState().startDueSeasons();
    });
    return () => sub.remove();
  }, [hydrated]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="payment/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="person/new" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

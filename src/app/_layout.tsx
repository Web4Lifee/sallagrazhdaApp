import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import regularSymbols from 'expo-symbols/androidWeights/regular';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { LoadingScreen } from '@/components/LoadingScreen';
import { colors } from '@/constants/theme';
import { useSession } from '@/store/session';
import { useHydrated, useStore } from '@/store/useStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useHydrated();
  const status = useSession((s) => s.status);
  // Preload the Material Symbols font on Android/web so icons don't pop in.
  const [fontsLoaded, fontError] = useFonts(
    Platform.OS === 'ios' ? {} : { [regularSymbols.name]: regularSymbols.font },
  );
  const ready = hydrated && status !== 'loading' && (fontsLoaded || !!fontError);
  const signedIn = status === 'signedIn';

  useEffect(() => {
    useSession.getState().init();
  }, []);

  // Refresh from the server on launch and whenever the app comes back to the foreground.
  // The server starts seasons and creates yearly tickets itself. Offline, the cached data is shown.
  useEffect(() => {
    if (!hydrated || !signedIn) return;
    const refresh = () => useStore.getState().sync().catch(() => {});
    refresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [hydrated, signedIn]);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // The loading screen looks like the native splash; once it is on screen the splash can go,
  // so a slow start shows the spinner instead of a frozen splash.
  if (!ready) return <LoadingScreen onLayout={() => SplashScreen.hide()} />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="payment/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="person/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="person/[id]" />
          <Stack.Screen name="ticket/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

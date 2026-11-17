import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AppText, Button, Card, Field } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { SERVER_URL } from '@/lib/credentials';
import { reportError } from '@/lib/useBusy';
import { firstSync, ImportDeclined } from '@/store/first-sync';
import { useSession } from '@/store/session';

/** Only a build without a usable EXPO_PUBLIC_API_URL (see .env) shows this. */
const NO_SERVER_MESSAGE = 'Ky version i aplikacionit nuk ka adresë serveri. Kontaktoni administratorin.';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const signIn = useSession((s) => s.signIn);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(SERVER_URL ? null : NO_SERVER_MESSAGE);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const canSubmit = !!SERVER_URL && !!username.trim() && !!password && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), password, firstSync);
    } catch (e) {
      if (e instanceof ImportDeclined) {
        setError('Hyrja u anulua. Të dhënat e telefonit mbetën të pandryshuara.');
      } else if (e instanceof ApiError && e.status === 401) {
        setError('Emri i përdoruesit ose fjalëkalimi është i gabuar.');
        setPassword('');
      } else if (e instanceof ApiError && e.code === 'NO_SERVER') {
        setError(NO_SERVER_MESSAGE);
      } else if (e instanceof ApiError && e.code === 'NOT_OUR_SERVER') {
        // A plain http:// address only happens in development, with a local backend (.env.local).
        setError(
          __DEV__ && Platform.OS !== 'web' && SERVER_URL?.startsWith('http://')
            ? `Serveri lokal nuk u gjet në ${SERVER_URL.replace(/^https?:\/\//, '')}. Telefoni dhe kompjuteri duhet të jenë në të njëjtin Wi-Fi, dhe serveri i hapur për rrjetin: API_BIND=0.0.0.0 në skedarin .env të serverit, pastaj docker compose up -d`
            : 'Nuk u lidh me serverin. Kontrolloni internetin dhe provoni përsëri.',
        );
      } else {
        reportError(e);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="leaf" size={34} color={colors.primary} />
          </View>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            Mirëmbajtja e Oborrit
          </AppText>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            Hyni për të parë dhe ruajtur pagesat. Të dhënat ruhen të sigurta në server.
          </AppText>
        </View>

        <Card style={{ gap: space.lg }}>
          <Field
            label="Përdoruesi"
            value={username}
            onChangeText={setUsername}
            placeholder="p.sh. admin"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
          <Field
            ref={passwordRef}
            label="Fjalëkalimi"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? (
            <View style={styles.error}>
              <Icon name="alert" size={18} color={colors.danger} />
              <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button label="Hyr" icon="lock" size="lg" loading={busy} disabled={!canSubmit} onPress={submit} />
        </Card>

        <AppText variant="caption" style={{ textAlign: 'center' }}>
          Llogaritë krijohen nga administratori i serverit.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl, gap: space.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  error: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    padding: space.md,
    borderRadius: radius.md,
  },
});

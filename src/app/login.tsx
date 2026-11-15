import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AppText, Button, Card, Field } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { DEFAULT_SERVER_URL, normalizeServerUrl } from '@/lib/credentials';
import { reportError } from '@/lib/useBusy';
import { firstSync, ImportDeclined } from '@/store/first-sync';
import { useSession } from '@/store/session';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const savedServer = useSession((s) => s.serverUrl);
  const signIn = useSession((s) => s.signIn);

  const [server, setServer] = useState(savedServer || DEFAULT_SERVER_URL);
  // The server field is only shown when no address is built in, or when the user wants to change it.
  const [editServer, setEditServer] = useState(!(savedServer || DEFAULT_SERVER_URL));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const serverUrl = normalizeServerUrl(server);
  const canSubmit = !!serverUrl && !!username.trim() && !!password && !busy;

  const submit = async () => {
    if (!serverUrl) {
      setEditServer(true);
      setError(__DEV__ ? 'Shkruani adresën e serverit.' : 'Shkruani adresën e serverit (duhet të fillojë me https://).');
      return;
    }
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(serverUrl, username.trim(), password, firstSync);
    } catch (e) {
      if (e instanceof ImportDeclined) {
        setError('Hyrja u anulua. Të dhënat e telefonit mbetën të pandryshuara.');
      } else if (e instanceof ApiError && e.status === 401) {
        setError('Emri i përdoruesit ose fjalëkalimi është i gabuar.');
        setPassword('');
      } else if (e instanceof ApiError && e.code === 'NOT_OUR_SERVER') {
        setEditServer(true);
        setError('Serveri nuk u gjet në këtë adresë. Kontrolloni adresën dhe internetin.');
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
          {editServer ? (
            <Field
              label="Adresa e serverit"
              value={server}
              onChangeText={setServer}
              placeholder="https://api.shembull.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              textContentType="URL"
            />
          ) : null}
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

        {!editServer ? (
          <View style={styles.serverRow}>
            <Icon name="cloud" size={16} color={colors.textMuted} />
            <AppText variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
              {serverUrl?.replace(/^https?:\/\//, '')}
            </AppText>
            <Button label="Ndrysho" variant="ghost" onPress={() => setEditServer(true)} />
          </View>
        ) : null}

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
  serverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
});

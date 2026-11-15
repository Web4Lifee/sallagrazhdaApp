import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PersonForm } from '@/components/PersonForm';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Card } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { haptic } from '@/lib/platform';
import { useBusy } from '@/lib/useBusy';
import { useStore } from '@/store/useStore';

/** Create a new person, or edit one when `id` is given. Optional `first`/`last` prefill from a search. */
export default function PersonFormScreen() {
  const { id, first, last } = useLocalSearchParams<{ id?: string; first?: string; last?: string }>();
  const insets = useSafeAreaInsets();
  const existing = useStore((s) => (id ? s.people.find((p) => p.id === id) : undefined));
  const addPerson = useStore((s) => s.addPerson);
  const updatePerson = useStore((s) => s.updatePerson);
  const editing = !!existing;
  const [busy, run] = useBusy();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={editing ? 'Ndrysho personin' : 'Person i ri'} mode="close" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Icon name={editing ? 'edit' : 'personAdd'} size={26} color={colors.primary} />
          </View>
          <AppText variant="caption" style={{ flex: 1 }}>
            {editing
              ? 'Ndryshoni të dhënat e personit. Pagesat e tij/saj mbeten të pandryshuara.'
              : 'Regjistroni personin që paguan për mirëmbajtjen e oborrit. Nëse sezoni ka filluar, krijohet automatikisht fletëpagesa vjetore.'}
          </AppText>
        </View>
        <Card>
          <PersonForm
            initial={existing ?? { firstName: first ?? '', lastName: last ?? '' }}
            editingId={existing?.id}
            submitLabel={editing ? 'Ruaj ndryshimet' : 'Regjistro personin'}
            busy={busy}
            onSubmit={(input) =>
              run(async () => {
                if (existing) {
                  await updatePerson(existing.id, input);
                  haptic.success();
                  goBack();
                } else {
                  const person = await addPerson(input);
                  haptic.success();
                  router.replace(`/person/${person.id}`);
                }
              })
            }
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, gap: space.lg, paddingTop: space.xs },
  intro: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

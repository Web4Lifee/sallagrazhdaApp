import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppText, Button, Field } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { normalize } from '@/lib/search';
import type { Person, PersonInput } from '@/lib/types';
import { useStore } from '@/store/useStore';

type Props = {
  initial?: Partial<PersonInput>;
  /** Ignore this person when checking duplicates (editing). */
  editingId?: string;
  submitLabel: string;
  onSubmit: (input: PersonInput) => void | Promise<void>;
  onCancel?: () => void;
  /** Shows a spinner on the submit button while the server saves. */
  busy?: boolean;
};

export function PersonForm({ initial, editingId, submitLabel, onSubmit, onCancel, busy }: Props) {
  const people = useStore((s) => s.people);
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [fatherName, setFatherName] = useState(initial?.fatherName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [submitted, setSubmitted] = useState(false);
  const fatherRef = useRef<TextInputInstance>(null);
  const lastRef = useRef<TextInputInstance>(null);

  const errors = {
    firstName: firstName.trim() ? undefined : 'Shkruani emrin',
    fatherName: fatherName.trim() ? undefined : 'Shkruani emrin e babait',
    lastName: lastName.trim() ? undefined : 'Shkruani mbiemrin',
  };
  const valid = !errors.firstName && !errors.fatherName && !errors.lastName;

  const duplicate = useMemo<Person | undefined>(() => {
    if (!valid) return undefined;
    const key = [firstName, fatherName, lastName].map(normalize).join('|');
    return people.find(
      (p) => p.id !== editingId && [p.firstName, p.fatherName, p.lastName].map(normalize).join('|') === key,
    );
  }, [people, firstName, fatherName, lastName, valid, editingId]);

  const submit = () => {
    setSubmitted(true);
    if (!valid || busy) return;
    void onSubmit({ firstName, fatherName, lastName });
  };

  return (
    <View style={{ gap: space.lg }}>
      <Field
        label="Emri"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="p.sh. Arben"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => fatherRef.current?.focus()}
        submitBehavior="submit"
        error={submitted ? errors.firstName : undefined}
      />
      <Field
        ref={fatherRef}
        label="Emri i babait"
        value={fatherName}
        onChangeText={setFatherName}
        placeholder="p.sh. Ismet"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => lastRef.current?.focus()}
        submitBehavior="submit"
        error={submitted ? errors.fatherName : undefined}
      />
      <Field
        ref={lastRef}
        label="Mbiemri"
        value={lastName}
        onChangeText={setLastName}
        placeholder="p.sh. Krasniqi"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
        error={submitted ? errors.lastName : undefined}
      />

      {duplicate ? (
        <View style={styles.warning}>
          <Icon name="alert" size={18} color={colors.warning} />
          <AppText variant="caption" color={colors.warning} style={{ flex: 1 }}>
            Ekziston tashmë një person me këtë emër, emër babai dhe mbiemër.
          </AppText>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button label={submitLabel} icon="check" size="lg" loading={busy} onPress={submit} />
        {onCancel ? <Button label="Anulo" variant="ghost" onPress={onCancel} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    padding: space.md,
    borderRadius: radius.md,
  },
});

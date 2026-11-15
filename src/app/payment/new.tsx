import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PersonForm } from '@/components/PersonForm';
import { PersonRow } from '@/components/Rows';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { AppText, Avatar, Button, Card, Chip, EmptyState, Field } from '@/components/ui';
import { colors, font, radius, shadow, space } from '@/constants/theme';
import { formatMoney, fullName, parseAmount, receiptNumber } from '@/lib/format';
import { haptic } from '@/lib/platform';
import { useSeasonInfo } from '@/store/seasons';
import { comparePeople, searchPeople } from '@/lib/search';
import type { Ticket } from '@/lib/types';
import { useDebounced } from '@/lib/useDebounced';
import { useStore } from '@/store/useStore';

type PaymentOption = {
  key: string;
  kind: 'settle' | 'newAnnual' | 'extra';
  title: string;
  sub: string;
  due?: number;
  ticket?: Ticket;
};

export default function NewPaymentScreen() {
  const params = useLocalSearchParams<{ personId?: string }>();
  const insets = useSafeAreaInsets();
  const people = useStore((s) => s.people);
  const tickets = useStore((s) => s.tickets);
  const settings = useStore((s) => s.settings);
  const addPerson = useStore((s) => s.addPerson);
  const createPayment = useStore((s) => s.createPayment);

  const [personId, setPersonId] = useState<string | undefined>(params.personId);
  const [query, setQuery] = useState('');
  const [registering, setRegistering] = useState(false);
  const [optionKey, setOptionKey] = useState<string | null>(null);
  const [amountText, setAmountText] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [note, setNote] = useState('');

  const debounced = useDebounced(query, 300);
  const pending = query.trim() !== debounced.trim();
  const person = people.find((p) => p.id === personId);
  const info = useSeasonInfo();
  const season = info.active;

  const fee = settings.annualFee;

  const results = useMemo(
    () => (debounced.trim() ? searchPeople(people, debounced) : [...people].sort(comparePeople).slice(0, 50)),
    [people, debounced],
  );

  const options: PaymentOption[] = (() => {
    if (!person) return [];
    const annual = tickets.filter((t) => t.personId === person.id && t.kind === 'annual');
    const list: PaymentOption[] = annual
      .filter((t) => t.status === 'unpaid')
      .sort((a, b) => a.season - b.season)
      .map((t) => ({
        key: t.id,
        kind: 'settle',
        ticket: t,
        due: t.due ?? t.amount,
        title: `Tarifa vjetore ${info.label(t.season)}`,
        sub: `Fletëpagesë e hapur ${receiptNumber(t.number)} · ${formatMoney(t.due ?? t.amount)}`,
      }));
    if (!annual.some((t) => t.season === season)) {
      list.push({
        key: 'new-annual',
        kind: 'newAnnual',
        due: fee,
        title: `Tarifa vjetore ${info.label(season)}`,
        sub: info.current ? `Paguaj tarifën e këtij sezoni · ${formatMoney(fee)}` : `Pagesë paraprake për sezonin e ardhshëm · ${formatMoney(fee)}`,
      });
    }
    list.push({ key: 'extra', kind: 'extra', title: 'Pagesë shtesë', sub: 'Jashtë tarifës vjetore' });
    return list;
  })();

  const option = options.find((o) => o.key === optionKey) ?? options[0];
  const amountValue = amountText ?? (option?.due !== undefined ? String(option.due).replace('.', ',') : '');
  const selectedReasons = reasons ?? (option?.kind === 'extra' ? [] : settings.reasons.slice(0, 1));
  const amount = parseAmount(amountValue);
  const amountValid = Number.isFinite(amount) && amount > 0;
  const reasonsValid = settings.reasons.length === 0 || selectedReasons.length > 0;
  const canSave = !!person && !!option && amountValid && reasonsValid;
  const presets = [...new Set([fee, 50, 100])].sort((a, b) => a - b);

  const selectPerson = (id: string) => {
    haptic.tap();
    Keyboard.dismiss();
    setPersonId(id);
    setOptionKey(null);
    setAmountText(null);
    setReasons(null);
  };

  const chooseOption = (key: string) => {
    haptic.tap();
    setOptionKey(key);
    setAmountText(null);
    setReasons(null);
  };

  const toggleReason = (r: string) =>
    setReasons(selectedReasons.includes(r) ? selectedReasons.filter((x) => x !== r) : [...selectedReasons, r]);

  const save = () => {
    if (!canSave || !person || !option) return;
    const ticket = createPayment({
      personId: person.id,
      amount,
      reasons: selectedReasons,
      note,
      settleTicketId: option.kind === 'settle' ? option.ticket?.id : undefined,
      asAnnual: option.kind === 'newAnnual',
    });
    haptic.success();
    router.replace({ pathname: '/ticket/[id]', params: { id: ticket.id, created: '1' } });
  };

  /* ---------- Step 1: choose who is paying ---------- */
  if (!person) {
    const [first = '', ...rest] = debounced.trim().split(/\s+/);
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Pagesë e re" subtitle="Hapi 1 nga 2 · Zgjidhni personin" mode="close" />
        {registering ? (
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
            <Card>
              <AppText variant="heading" style={{ marginBottom: space.lg }}>
                Regjistro person të ri
              </AppText>
              <PersonForm
                initial={{ firstName: first, lastName: rest.join(' ') }}
                submitLabel="Regjistro dhe vazhdo"
                onCancel={() => setRegistering(false)}
                onSubmit={(input) => {
                  const p = addPerson(input);
                  setRegistering(false);
                  setQuery('');
                  selectPerson(p.id);
                }}
              />
            </Card>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, gap: space.md }}>
            <View style={{ paddingHorizontal: space.xl, gap: space.md }}>
              <SearchBar value={query} onChangeText={setQuery} autoFocus={people.length > 0} pending={pending} />
              <Button label="Regjistro person të ri" icon="personAdd" variant="secondary" onPress={() => setRegistering(true)} />
            </View>
            <AppText variant="label" style={{ paddingHorizontal: space.xl + 4 }}>
              {debounced.trim() ? (pending ? 'Duke kërkuar…' : `Sugjerime · ${results.length}`) : 'Të gjithë personat'}
            </AppText>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: space.md + 2, paddingBottom: insets.bottom + space.xxl }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag">
              {results.map((p) => (
                <PersonRow key={p.id} person={p} onPress={() => selectPerson(p.id)} />
              ))}
              {!pending && results.length === 0 ? (
                <EmptyState
                  icon={people.length ? 'search' : 'people'}
                  title={people.length ? 'Nuk u gjet askush' : "Ende s'ka persona"}
                  message={people.length ? 'Regjistroni personin si të ri.' : 'Regjistroni personin e parë për të vazhduar.'}
                  action={<Button label="Regjistro person të ri" icon="personAdd" onPress={() => setRegistering(true)} />}
                />
              ) : null}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  /* ---------- Step 2: payment details ---------- */
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Pagesë e re" subtitle="Hapi 2 nga 2 · Detajet e pagesës" mode="close" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space.xxl }]} keyboardShouldPersistTaps="handled">
        {/* Payer */}
        <Card style={styles.payer}>
          <Avatar person={person} size={48} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" numberOfLines={1}>
              {fullName(person)}
            </AppText>
            <AppText variant="caption">Babai: {person.fatherName}</AppText>
          </View>
          <Pressable hitSlop={8} onPress={() => setPersonId(undefined)} style={styles.changeBtn}>
            <Text style={styles.changeText}>Ndrysho</Text>
          </Pressable>
        </Card>

        {/* What is being paid */}
        <View style={{ gap: space.sm }}>
          <AppText variant="label">Për çfarë paguan</AppText>
          {options.map((o) => {
            const selected = o.key === option?.key;
            return (
              <Pressable
                key={o.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => chooseOption(o.key)}
                style={[styles.option, selected && styles.optionSelected]}>
                <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{o.title}</AppText>
                  <AppText variant="caption">{o.sub}</AppText>
                </View>
                <Icon
                  name={o.kind === 'extra' ? 'wallet' : o.kind === 'settle' ? 'clock' : 'leaf'}
                  size={18}
                  color={o.kind === 'settle' ? colors.warning : o.kind === 'extra' ? '#2F5FB3' : colors.primary}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Amount */}
        <Card style={{ gap: space.md }}>
          <AppText variant="label">Shuma</AppText>
          <View style={styles.amountWrap}>
            <TextInput
              value={amountValue}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              style={styles.amountInput}
              selectTextOnFocus
            />
            <Text style={styles.euro}>€</Text>
          </View>
          <View style={styles.presets}>
            {presets.map((p) => (
              <Chip key={p} label={formatMoney(p)} selected={amountValid && amount === p} onPress={() => setAmountText(String(p))} />
            ))}
          </View>
          {!amountValid && amountValue !== '' ? (
            <AppText variant="caption" color={colors.danger}>
              Shkruani një shumë të vlefshme
            </AppText>
          ) : option?.due && amountValid && amount > option.due ? (
            <View style={styles.hint}>
              <Icon name="add" size={15} color={colors.success} />
              <AppText variant="caption" color={colors.success}>
                Tarifa {formatMoney(option.due)} + {formatMoney(amount - option.due)} shtesë
              </AppText>
            </View>
          ) : option?.due && amountValid && amount < option.due ? (
            <View style={styles.hint}>
              <Icon name="alert" size={15} color={colors.warning} />
              <AppText variant="caption" color={colors.warning}>
                Më pak se tarifa vjetore ({formatMoney(option.due)})
              </AppText>
            </View>
          ) : null}
        </Card>

        {/* Reasons */}
        <View style={{ gap: space.sm }}>
          <AppText variant="label">Arsyet e pagesës</AppText>
          {settings.reasons.length ? (
            <View style={styles.presets}>
              {settings.reasons.map((r) => (
                <Chip key={r} label={r} selected={selectedReasons.includes(r)} onPress={() => toggleReason(r)} />
              ))}
            </View>
          ) : (
            <AppText variant="caption">Shtoni arsye pagese te Cilësimet.</AppText>
          )}
          {!reasonsValid ? (
            <AppText variant="caption" color={colors.danger}>
              Zgjidhni të paktën një arsye
            </AppText>
          ) : null}
        </View>

        <Field label="Shënim (opsional)" value={note} onChangeText={setNote} placeholder="p.sh. pagoi për dy vite" multiline style={{ minHeight: 70, paddingTop: 14, textAlignVertical: 'top' }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button
          label={amountValid ? `Ruaj pagesën · ${formatMoney(amount)}` : 'Ruaj pagesën'}
          icon="check"
          size="lg"
          disabled={!canSave}
          onPress={save}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, gap: space.xl, paddingTop: space.xs },
  payer: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  changeBtn: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  changeText: { color: colors.primaryDark, fontWeight: font.semibold, fontSize: 13 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#F6FBF8' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  amountInput: { fontSize: 44, fontWeight: font.heavy, color: colors.text, minWidth: 100, textAlign: 'center', padding: 0, letterSpacing: -1 },
  euro: { fontSize: 32, fontWeight: font.bold, color: colors.textMuted },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.floating,
  },
});

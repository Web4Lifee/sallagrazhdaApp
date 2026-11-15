import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Avatar, Button, EmptyState, IconButton, StatusBadge } from '@/components/ui';
import { colors, font, radius, shadow, space } from '@/constants/theme';
import { formatDateTime, formatMoney, formalName, parseAmount, receiptNumber } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { confirm, haptic, notify } from '@/lib/platform';
import { printReceipt } from '@/lib/receipt';
import { useSeasonInfo } from '@/store/seasons';
import { useStore } from '@/store/useStore';

export default function TicketScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const insets = useSafeAreaInsets();
  const ticket = useStore((s) => s.tickets.find((t) => t.id === id));
  const person = useStore((s) => (ticket ? s.people.find((p) => p.id === ticket.personId) : undefined));
  const settings = useStore((s) => s.settings);
  const info = useSeasonInfo();
  const markPaid = useStore((s) => s.markPaid);
  const markUnpaid = useStore((s) => s.markUnpaid);
  const deleteTicket = useStore((s) => s.deleteTicket);

  const [amountText, setAmountText] = useState(() => (ticket ? String(ticket.amount).replace('.', ',') : ''));
  const [printing, setPrinting] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  if (!ticket || !person) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Fletëpagesa" />
        <EmptyState icon="receipt" title="Fletëpagesa nuk ekziston" message="Mund të jetë fshirë." />
      </View>
    );
  }

  const paid = ticket.status === 'paid';
  const amount = parseAmount(amountText);
  const amountValid = Number.isFinite(amount) && amount > 0;
  const extra = ticket.kind === 'annual' && ticket.due && ticket.amount > ticket.due ? ticket.amount - ticket.due : 0;

  const onPrint = async () => {
    setPrinting(true);
    try {
      await printReceipt(ticket, person, settings, info.label(ticket.season));
    } catch (e) {
      notify('Printimi dështoi', e instanceof Error ? e.message : undefined);
    } finally {
      setPrinting(false);
    }
  };

  const onMarkPaid = () => {
    if (!amountValid) return;
    markPaid(ticket.id, amount);
    haptic.success();
    setJustPaid(true);
  };

  const onMarkUnpaid = async () => {
    const ok = await confirm({
      title: 'Të kthehet në pa paguar?',
      message: 'Pagesa do të hiqet nga totali i mbledhur.',
      confirmText: 'Po, ktheje',
    });
    if (!ok) return;
    markUnpaid(ticket.id);
    setAmountText(String(ticket.due ?? ticket.amount).replace('.', ','));
    setJustPaid(false);
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Të fshihet fletëpagesa?',
      message: `${receiptNumber(ticket.number)} · ${formatMoney(ticket.amount)}. Ky veprim nuk kthehet mbrapsht.`,
      confirmText: 'Fshij',
      destructive: true,
    });
    if (!ok) return;
    haptic.warning();
    goBack();
    deleteTicket(ticket.id);
  };

  const banner = created === '1' ? 'Pagesa u ruajt me sukses' : justPaid ? 'Fletëpagesa u shënua si e paguar' : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Fletëpagesa"
        subtitle={receiptNumber(ticket.number)}
        right={<IconButton icon="trash" label="Fshij fletëpagesën" color={colors.danger} onPress={onDelete} />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled">
        {banner && paid ? (
          <View style={styles.banner}>
            <Icon name="checkCircle" size={20} color={colors.success} />
            <AppText variant="bodyStrong" color={colors.success} style={{ flex: 1 }}>
              {banner}
            </AppText>
          </View>
        ) : null}

        {/* Receipt card */}
        <View style={styles.receipt}>
          <View style={styles.receiptTop}>
            <AppText variant="label">{settings.organization}</AppText>
            <Text style={styles.amount}>{formatMoney(ticket.amount)}</Text>
            <StatusBadge status={ticket.status} />
          </View>

          <View style={styles.perforation}>
            <View style={[styles.notch, { left: -12 }]} />
            <View style={styles.dashes} />
            <View style={[styles.notch, { right: -12 }]} />
          </View>

          <View style={styles.receiptBody}>
            <Pressableish onPress={() => router.push(`/person/${person.id}`)}>
              <Avatar person={person} size={40} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption">Paguesi</AppText>
                <AppText variant="bodyStrong">{formalName(person)}</AppText>
              </View>
              <Icon name="chevronRight" size={16} color={colors.textFaint} />
            </Pressableish>

            <Line label="Lloji" value={ticket.kind === 'annual' ? 'Tarifa vjetore' : 'Pagesë shtesë'} />
            <Line label="Sezoni" value={`${info.label(ticket.season)} · ${info.range(ticket.season)}`} />
            {ticket.kind === 'annual' && ticket.due ? <Line label="Tarifa" value={formatMoney(ticket.due)} /> : null}
            {extra > 0 ? <Line label="Pagesë shtesë" value={formatMoney(extra)} /> : null}
            <Line label="Krijuar më" value={formatDateTime(ticket.createdAt)} />
            {ticket.paidAt ? <Line label="Paguar më" value={formatDateTime(ticket.paidAt)} /> : null}
            <Line label="Pranoi" value={settings.adminName} />

            <View style={{ gap: 8 }}>
              <AppText variant="caption">Arsyet e pagesës</AppText>
              <View style={styles.reasons}>
                {ticket.reasons.length ? (
                  ticket.reasons.map((r) => (
                    <View key={r} style={styles.reason}>
                      <Text style={styles.reasonText}>{r}</Text>
                    </View>
                  ))
                ) : (
                  <AppText variant="caption">—</AppText>
                )}
              </View>
            </View>

            {ticket.note ? (
              <View style={styles.note}>
                <Icon name="note" size={16} color={colors.textMuted} />
                <AppText variant="body" style={{ flex: 1 }}>
                  {ticket.note}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        {paid ? (
          <View style={{ gap: space.sm }}>
            <Button label="Printo fletëpagesën" icon="print" size="lg" loading={printing} onPress={onPrint} />
            {ticket.kind === 'annual' ? (
              <Button label="Kthe në pa paguar" icon="undo" variant="ghost" onPress={onMarkUnpaid} />
            ) : null}
          </View>
        ) : (
          <View style={styles.payBox}>
            <AppText variant="heading">Regjistro pagesën</AppText>
            <AppText variant="caption">Mund ta ndryshoni shumën nëse personi paguan më shumë se tarifa.</AppText>
            <View style={styles.amountInputWrap}>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                selectTextOnFocus
              />
              <Text style={styles.euro}>€</Text>
            </View>
            {!amountValid ? (
              <AppText variant="caption" color={colors.danger}>
                Shkruani një shumë të vlefshme
              </AppText>
            ) : ticket.due && amount > ticket.due ? (
              <AppText variant="caption" color={colors.success}>
                Tarifa {formatMoney(ticket.due)} + {formatMoney(amount - ticket.due)} shtesë
              </AppText>
            ) : null}
            <Button label="Shëno si të paguar" icon="checkCircle" size="lg" disabled={!amountValid} onPress={onMarkPaid} />
            <Button label="Printo si të papaguar" icon="print" variant="secondary" loading={printing} onPress={onPrint} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

function Pressableish({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.payer, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, gap: space.lg, paddingTop: space.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.successSoft,
    padding: space.md,
    borderRadius: radius.md,
  },
  receipt: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card },
  receiptTop: { alignItems: 'center', gap: space.sm, padding: space.xl },
  amount: { fontSize: 40, fontWeight: font.heavy, color: colors.text, letterSpacing: -1 },
  perforation: { height: 24, justifyContent: 'center' },
  notch: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bg },
  dashes: {
    marginHorizontal: space.xl,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  receiptBody: { padding: space.xl, paddingTop: space.md, gap: space.md },
  payer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceMuted,
    padding: space.md,
    borderRadius: radius.md,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.lg },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reason: { backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  reasonText: { color: colors.primaryDark, fontSize: 13, fontWeight: font.semibold },
  note: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.surfaceMuted, padding: space.md, borderRadius: radius.md },
  payBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  amountInput: { fontSize: 34, fontWeight: font.heavy, color: colors.text, minWidth: 90, textAlign: 'center', padding: 0 },
  euro: { fontSize: 28, fontWeight: font.bold, color: colors.textMuted },
});

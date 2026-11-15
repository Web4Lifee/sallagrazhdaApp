import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TicketRow } from '@/components/Rows';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Avatar, Button, Card, EmptyState, IconButton, SectionHeader, StatusBadge } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';
import { formatDate, formatMoney, fullName } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { confirm, haptic } from '@/lib/platform';
import { reportError } from '@/lib/useBusy';
import { useSeasonInfo } from '@/store/seasons';
import { seasonStatusMap, sortTicketsByDate } from '@/store/selectors';
import { useStore } from '@/store/useStore';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const person = useStore((s) => s.people.find((p) => p.id === id));
  const allTickets = useStore((s) => s.tickets);
  const deletePerson = useStore((s) => s.deletePerson);
  const info = useSeasonInfo();
  const season = info.active;

  const tickets = useMemo(() => sortTicketsByDate(allTickets.filter((t) => t.personId === id)), [allTickets, id]);
  const status = useMemo(() => seasonStatusMap(tickets, season).get(id) ?? 'none', [tickets, season, id]);
  const totals = useMemo(() => {
    let paid = 0;
    let paidCount = 0;
    let unpaid = 0;
    for (const t of tickets) {
      if (t.status === 'paid') {
        paid += t.amount;
        paidCount++;
      } else unpaid += t.amount;
    }
    return { paid, paidCount, unpaid };
  }, [tickets]);

  if (!person) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Kartela" />
        <EmptyState icon="person" title="Personi nuk ekziston" message="Mund të jetë fshirë." />
      </View>
    );
  }

  const onDelete = async () => {
    const ok = await confirm({
      title: `Të fshihet ${fullName(person)}?`,
      message:
        tickets.length > 0
          ? `Do të fshihen edhe ${tickets.length} fletëpagesat e tij/saj. Ky veprim nuk kthehet mbrapsht.`
          : 'Ky veprim nuk kthehet mbrapsht.',
      confirmText: 'Fshij',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePerson(person.id);
      haptic.warning();
      goBack();
    } catch (e) {
      reportError(e);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Kartela"
        right={
          <>
            <IconButton icon="edit" label="Ndrysho" onPress={() => router.push({ pathname: '/person/new', params: { id: person.id } })} />
            <IconButton icon="trash" label="Fshij personin" color={colors.danger} onPress={onDelete} />
          </>
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Card style={styles.profile}>
          <Avatar person={person} size={76} />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <AppText variant="title" style={{ textAlign: 'center' }}>
              {fullName(person)}
            </AppText>
            <AppText variant="caption">
              Babai: <Text style={{ color: colors.text, fontWeight: font.semibold }}>{person.fatherName}</Text> · Regjistruar më{' '}
              {formatDate(person.createdAt)}
            </AppText>
          </View>
          <View style={styles.seasonStatus}>
            <AppText variant="caption">Tarifa vjetore {info.label(season)}</AppText>
            <StatusBadge status={status} />
          </View>

          <View style={styles.statsRow}>
            <Stat label="Gjithsej paguar" value={formatMoney(totals.paid)} color={colors.success} />
            <View style={styles.statDivider} />
            <Stat label="Pagesa" value={String(totals.paidCount)} />
            <View style={styles.statDivider} />
            <Stat label="Pa paguar" value={formatMoney(totals.unpaid)} color={totals.unpaid > 0 ? colors.warning : colors.text} />
          </View>
        </Card>

        <Button
          label="Pagesë e re"
          icon="add"
          size="lg"
          onPress={() => router.push({ pathname: '/payment/new', params: { personId: person.id } })}
        />

        <Card style={{ paddingHorizontal: space.sm, paddingVertical: space.md }}>
          <View style={{ paddingHorizontal: space.sm }}>
            <SectionHeader title="Historiku i pagesave" action={<AppText variant="caption">{tickets.length} gjithsej</AppText>} />
          </View>
          {tickets.length === 0 ? (
            <EmptyState icon="receipt" title="Ende s'ka fletëpagesa" message="Pagesat e këtij personi do të shfaqen këtu, sipas datës." />
          ) : (
            tickets.map((t) => (
              <TicketRow key={t.id} ticket={t} seasonLabel={info.label(t.season)} onPress={() => router.push(`/ticket/${t.id}`)} />
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 17, fontWeight: font.heavy, color }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <AppText variant="caption" style={{ fontSize: 12, textAlign: 'center' }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, gap: space.lg, paddingTop: space.xs },
  profile: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  seasonStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceMuted,
    paddingLeft: space.md,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: space.sm,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border },
});

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { TicketRow } from '@/components/Rows';
import { AppText, Card, EmptyState, SectionHeader } from '@/components/ui';
import { colors, font, radius, shadow, space, TAB_BAR_SPACE } from '@/constants/theme';
import { firstWord, formatDate, formatMoney } from '@/lib/format';
import { haptic } from '@/lib/platform';
import { seasonStartLabel } from '@/lib/season';
import { useSeasonInfo } from '@/store/seasons';
import { computeSeasonStats, knownSeasons, recentPayments } from '@/store/selectors';
import { useRefresh } from '@/store/useRefresh';
import { useStore } from '@/store/useStore';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const people = useStore((s) => s.people);
  const tickets = useStore((s) => s.tickets);
  const settings = useStore((s) => s.settings);
  const info = useSeasonInfo();
  const active = info.active;
  const started = !!info.current;
  const seasons = useMemo(() => knownSeasons(tickets, active), [tickets, active]);
  const [picked, setPicked] = useState<number | null>(null);
  const season = picked !== null && seasons.includes(picked) ? picked : active;
  const seasonIdx = seasons.indexOf(season);

  const stats = useMemo(() => computeSeasonStats(people, tickets, settings, season), [people, tickets, settings, season]);
  const recent = useMemo(() => recentPayments(people, tickets, 3), [people, tickets]);
  const goalReached = stats.goal > 0 && stats.collected >= stats.goal;
  const { refreshing, onRefresh } = useRefresh();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }>
      {/* Greeting */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption">Mirë se vini,</AppText>
          <AppText variant="title" numberOfLines={1}>
            {firstWord(settings.adminName)}
          </AppText>
        </View>
        <View style={styles.datePill}>
          <Icon name="calendar" size={15} color={colors.textMuted} />
          <Text style={styles.datePillText}>{formatDate(new Date())}</Text>
        </View>
      </View>

      {/* Season switcher */}
      <View style={styles.seasonRow}>
        <SeasonArrow icon="chevronLeft" disabled={seasonIdx <= 0} onPress={() => setPicked(seasons[seasonIdx - 1])} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="bodyStrong">Sezoni {info.label(season)}</AppText>
          <AppText variant="caption">
            {info.range(season)}
            {season === active ? (started ? ' · aktual' : ' · i ardhshëm') : ''}
          </AppText>
        </View>
        <SeasonArrow
          icon="chevronRight"
          disabled={seasonIdx >= seasons.length - 1}
          onPress={() => setPicked(seasons[seasonIdx + 1])}
        />
      </View>

      {/* Hero */}
      <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroDecor} />
        <View style={styles.heroLabelRow}>
          <Text style={styles.heroLabel}>Të mbledhura</Text>
          <View style={styles.heroBadge}>
            <Icon name="flag" size={13} color={colors.primaryDark} />
            <Text style={styles.heroBadgeText}>Kostoja {formatMoney(stats.goal)}</Text>
          </View>
        </View>
        <Text style={styles.heroAmount} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(stats.collected)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(stats.progress * 100, stats.collected > 0 ? 3 : 0)}%` }]} />
        </View>
        <View style={styles.heroFooter}>
          <Text style={styles.heroFoot}>{Math.round(stats.progress * 100)}% e mbuluar</Text>
          {goalReached ? (
            <View style={styles.heroReached}>
              <Icon name="sparkles" size={14} color={colors.accent} />
              <Text style={[styles.heroFoot, { color: colors.accent, fontWeight: font.bold }]}>Kostoja u mbulua!</Text>
            </View>
          ) : (
            <Text style={styles.heroFoot}>
              Mbeten <Text style={{ fontWeight: font.bold, color: '#fff' }}>{formatMoney(stats.remaining)}</Text>
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* New payment CTA */}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic.tap();
          router.push('/payment/new');
        }}
        style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.985 }], opacity: 0.95 }]}>
        <View style={styles.ctaIcon}>
          <Icon name="add" size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">Pagesë e re</AppText>
          <AppText variant="caption">Kërko personin ose regjistro një të ri</AppText>
        </View>
        <Icon name="chevronRight" size={18} color={colors.textFaint} />
      </Pressable>

      {!started ? (
        <View style={styles.notice}>
          <Icon name="info" size={20} color={colors.warning} />
          <AppText variant="caption" color={colors.text} style={{ flex: 1 }}>
            Sezoni {info.label(info.nextYear)} fillon automatikisht më{' '}
            <Text style={{ fontWeight: font.bold }}>{seasonStartLabel(info.nextYear, settings.seasonStartMonth)}</Text> (ose tani, te
            Cilësimet). Atëherë krijohen fletëpagesat vjetore ({formatMoney(settings.annualFee)}) si të papaguara për{' '}
            {people.length === 1 ? '1 person' : `${people.length} persona`}.
          </AppText>
        </View>
      ) : null}

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatTile
          icon="people"
          tone="primary"
          label="Kanë paguar"
          value={`${stats.paidPeople}`}
          suffix={`/ ${stats.totalPeople}`}
          progress={stats.totalPeople ? stats.paidPeople / stats.totalPeople : 0}
        />
        <StatTile
          icon="clock"
          tone="warning"
          label="Pa paguar"
          value={`${stats.unpaidCount}`}
          sub={stats.outstanding > 0 ? `${formatMoney(stats.outstanding)} pritet` : 'Asgjë në pritje'}
        />
        <StatTile icon="receipt" tone="blue" label="Pagesa" value={`${stats.paymentsCount}`} sub="në këtë sezon" />
        <StatTile icon="add" tone="pink" label="Pagesa shtesë" value={formatMoney(stats.extra)} sub="mbi tarifën vjetore" />
      </View>

      {/* Recent payments */}
      <Card style={{ paddingHorizontal: space.sm, paddingVertical: space.md }}>
        <View style={{ paddingHorizontal: space.sm }}>
          <SectionHeader
            title="Pagesat e fundit"
            action={
              <Pressable hitSlop={8} onPress={() => router.navigate('/payments')}>
                <Text style={styles.link}>Shiko të gjitha</Text>
              </Pressable>
            }
          />
        </View>
        {recent.length === 0 ? (
          <EmptyState icon="wallet" title="Ende s'ka pagesa" message="Pagesat e regjistruara do të shfaqen këtu." />
        ) : (
          recent.map(({ ticket, person }) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              person={person}
              seasonLabel={info.label(ticket.season)}
              onPress={() => router.push(`/ticket/${ticket.id}`)}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function SeasonArrow({ icon, disabled, onPress }: { icon: IconName; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'chevronLeft' ? 'Sezoni i kaluar' : 'Sezoni tjetër'}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[styles.arrow, disabled && { opacity: 0.3 }]}>
      <Icon name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

const tones = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  blue: { bg: '#E6EEFB', fg: '#2F5FB3' },
  pink: { bg: '#F6E6F1', fg: '#A33C7E' },
};

function StatTile({
  icon,
  tone,
  label,
  value,
  suffix,
  sub,
  progress,
}: {
  icon: IconName;
  tone: keyof typeof tones;
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  progress?: number;
}) {
  const t = tones[tone];
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={18} color={t.fg} />
      </View>
      <AppText variant="caption" style={{ marginTop: space.md }}>
        {label}
      </AppText>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {suffix ? <Text style={styles.tileSuffix}> {suffix}</Text> : null}
      </Text>
      {progress !== undefined ? (
        <View style={styles.tileTrack}>
          <View style={[styles.tileFill, { width: `${progress * 100}%`, backgroundColor: t.fg }]} />
        </View>
      ) : sub ? (
        <AppText variant="caption" numberOfLines={1} style={{ fontSize: 12 }}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  datePillText: { fontSize: 13, color: colors.textMuted, fontWeight: font.medium },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  hero: { borderRadius: radius.xl, padding: space.xl, overflow: 'hidden', gap: space.sm, ...shadow.floating },
  heroDecor: {
    position: 'absolute',
    right: -60,
    top: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: font.medium },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  heroBadgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: font.bold },
  heroAmount: { color: '#fff', fontSize: 44, fontWeight: font.heavy, letterSpacing: -1.2, marginTop: 2 },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: space.sm },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.accent },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroFoot: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroReached: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  ctaIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.warningSoft,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: 24, fontWeight: font.heavy, color: colors.text, letterSpacing: -0.5, marginVertical: 2 },
  tileSuffix: { fontSize: 15, fontWeight: font.semibold, color: colors.textFaint },
  tileTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden', marginTop: 6 },
  tileFill: { height: '100%', borderRadius: 3 },
  link: { color: colors.primary, fontWeight: font.semibold, fontSize: 14 },
});

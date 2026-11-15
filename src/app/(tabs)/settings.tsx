import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { AppText, Button, Card, Chip, IconButton } from '@/components/ui';
import { colors, font, radius, space, TAB_BAR_SPACE } from '@/constants/theme';
import { formatDate, formatDateTime, formatMoney, MONTHS, parseAmount } from '@/lib/format';
import { confirm, haptic, notify } from '@/lib/platform';
import { printReceipt } from '@/lib/receipt';
import { seasonStart, seasonStartLabel } from '@/lib/season';
import type { PaperWidth, Settings } from '@/lib/types';
import { reportError, useBusy } from '@/lib/useBusy';
import { useSeasonInfo, useStartSeason } from '@/store/seasons';
import { useSession } from '@/store/session';
import { useStore } from '@/store/useStore';

/** A month whose 1st day has already arrived can't be scheduled; use "start now" instead. */
const isPast = (year: number, month: number) => seasonStart(year, month) <= new Date();

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const peopleCount = useStore((s) => s.people.length);
  const ticketCount = useStore((s) => s.tickets.length);
  const updateSettings = useStore((s) => s.updateSettings);
  const addReason = useStore((s) => s.addReason);
  const removeReason = useStore((s) => s.removeReason);
  const syncedAt = useStore((s) => s.syncedAt);
  const sync = useStore((s) => s.sync);
  const user = useSession((s) => s.user);
  const serverUrl = useSession((s) => s.serverUrl);
  const signOut = useSession((s) => s.signOut);
  const [syncBusy, runSync] = useBusy();

  // Shown immediately; rolled back with an alert if the server refuses it.
  const save = (patch: Partial<Settings>) => updateSettings(patch).catch(reportError);

  const [newReason, setNewReason] = useState('');
  const [printing, setPrinting] = useState(false);
  const month = settings.seasonStartMonth;
  const info = useSeasonInfo();
  const current = info.current;
  const startSeason = useStartSeason();

  const submitReason = async () => {
    try {
      if (await addReason(newReason)) {
        haptic.success();
        setNewReason('');
      } else if (newReason.trim()) {
        notify('Kjo arsye ekziston tashmë');
      }
    } catch (e) {
      reportError(e);
    }
  };

  const onSignOut = async () => {
    const ok = await confirm({
      title: 'Të dilni nga llogaria?',
      message: 'Të dhënat mbeten të ruajtura në server. Për t’i parë përsëri duhet të hyni me fjalëkalim.',
      confirmText: 'Dil',
      destructive: true,
    });
    if (ok) await signOut();
  };

  const testPrint = async () => {
    setPrinting(true);
    try {
      const now = new Date().toISOString();
      await printReceipt(
        {
          id: 'test',
          number: 0,
          personId: 'test',
          kind: 'annual',
          season: info.active,
          amount: settings.annualFee,
          due: settings.annualFee,
          reasons: settings.reasons.slice(0, 1),
          status: 'paid',
          createdAt: now,
          paidAt: now,
          note: 'Printim prove',
        },
        { id: 'test', firstName: 'Emri', fatherName: 'Babai', lastName: 'Mbiemri', createdAt: now },
        settings,
        info.label(info.active),
      );
    } catch (e) {
      notify('Printimi dështoi', e instanceof Error ? e.message : undefined);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="title">Cilësimet</AppText>
          <AppText variant="caption">Profili, kostoja, sezoni dhe arsyet e pagesës</AppText>
        </View>

        {/* Profile */}
        <Section icon="person" title="Profili">
          <TextSetting label="Emri juaj" value={settings.adminName} onCommit={(v) => save({ adminName: v })} />
          <Separator />
          <TextSetting
            label="Titulli në fletëpagesë"
            value={settings.organization}
            onCommit={(v) => save({ organization: v })}
          />
        </Section>

        {/* Money */}
        <Section icon="flag" title="Mbledhja">
          <NumberSetting
            label="Kostoja e mirëmbajtjes"
            hint="Shuma që i paguhet mirëmbajtësit të oborrit për sezon"
            value={settings.goal}
            onCommit={(v) => save({ goal: v })}
          />
          <Separator />
          <NumberSetting
            label="Tarifa vjetore për person"
            hint="Vlen për fletëpagesat e reja"
            value={settings.annualFee}
            onCommit={(v) => save({ annualFee: v })}
          />
        </Section>

        {/* Season */}
        <Section icon="calendar" title="Sezoni i mirëmbajtjes">
          {/* Current season */}
          <View style={styles.seasonNow}>
            <View style={[styles.seasonIcon, !current && { backgroundColor: colors.warningSoft }]}>
              <Icon name={current ? 'leaf' : 'clock'} size={22} color={current ? colors.primary : colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption">Sezoni aktual</AppText>
              <AppText variant="heading">{current ? info.label(current.year) : 'Ende pa filluar'}</AppText>
              {current ? (
                <AppText variant="caption">
                  Filloi më {formatDate(current.startedAt)} · {info.range(current.year)}
                </AppText>
              ) : null}
            </View>
          </View>
          <Separator />

          {/* Next season */}
          <View style={{ gap: space.sm }}>
            <AppText variant="bodyStrong">Sezoni i radhës: {info.label(info.nextYear)}</AppText>
            <AppText variant="caption">Muaji i fillimit</AppText>
            <View style={styles.reasons}>
              {MONTHS.map((m, i) => (
                <Chip
                  key={m}
                  label={m}
                  selected={i === month}
                  disabled={isPast(info.nextYear, i)}
                  onPress={() => save({ seasonStartMonth: i })}
                />
              ))}
            </View>
          </View>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Viti</AppText>
              <AppText variant="caption">{current ? 'Plotësohet automatikisht' : 'Viti i sezonit të parë'}</AppText>
            </View>
            {current ? (
              <Text style={styles.stepperValue}>{info.nextYear}</Text>
            ) : (
              <View style={styles.stepper}>
                <IconButton
                  icon="minus"
                  label="Viti i kaluar"
                  size={36}
                  background={colors.surfaceMuted}
                  disabled={isPast(settings.seasonStartYear - 1, month)}
                  onPress={() => save({ seasonStartYear: settings.seasonStartYear - 1 })}
                />
                <Text style={styles.stepperValue}>{settings.seasonStartYear}</Text>
                <IconButton
                  icon="add"
                  label="Viti tjetër"
                  size={36}
                  background={colors.surfaceMuted}
                  onPress={() => save({ seasonStartYear: settings.seasonStartYear + 1 })}
                />
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Icon name="info" size={18} color={colors.primary} />
            <AppText variant="caption" color={colors.text} style={{ flex: 1 }}>
              Fillon automatikisht më <Text style={styles.b}>{seasonStartLabel(info.nextYear, month)}</Text>: krijohet një fletëpagesë
              e papaguar ({formatMoney(settings.annualFee)}) për {peopleCount === 1 ? '1 person' : `secilin nga ${peopleCount} personat`}.
              Mund ta filloni edhe tani me butonin.
            </AppText>
          </View>
          <Button label={`Fillo sezonin ${info.label(info.nextYear)} tani`} icon="calendar" onPress={startSeason} />
        </Section>

        {/* Reasons */}
        <Section icon="tag" title="Arsyet e pagesës">
          <AppText variant="caption">Zgjidhen kur krijoni një pagesë të re. Një pagesë mund të ketë disa arsye.</AppText>
          <View style={styles.reasons}>
            {settings.reasons.map((r) => (
              <Chip key={r} label={r} onRemove={() => removeReason(r).catch(reportError)} />
            ))}
            {settings.reasons.length === 0 ? <AppText variant="caption">Nuk ka arsye. Shtoni një më poshtë.</AppText> : null}
          </View>
          <View style={styles.addRow}>
            <TextInput
              value={newReason}
              onChangeText={setNewReason}
              placeholder="Arsye e re, p.sh. Ndriçimi"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={submitReason}
              returnKeyType="done"
              style={styles.addInput}
            />
            <Button label="Shto" icon="add" onPress={submitReason} disabled={!newReason.trim()} />
          </View>
        </Section>

        {/* Printer */}
        <Section icon="print" title="Printeri termal">
          <AppText variant="caption">Gjerësia e letrës</AppText>
          <View style={styles.segment}>
            {([58, 80] as PaperWidth[]).map((w) => {
              const selected = settings.paperWidth === w;
              return (
                <Pressable
                  key={w}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptic.tap();
                    save({ paperWidth: w });
                  }}
                  style={[styles.segmentItem, selected && styles.segmentItemActive]}>
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{w} mm</Text>
                </Pressable>
              );
            })}
          </View>
          <Button label="Printo një fletëpagesë prove" icon="print" variant="secondary" loading={printing} onPress={testPrint} />
          <AppText variant="caption">
            Printimi bëhet përmes shërbimit të printimit të telefonit. Për printer termal me Bluetooth në Android, instaloni aplikacionin e
            shërbimit të printerit (p.sh. RawBT).
          </AppText>
        </Section>

        {/* Account */}
        <Section icon="lock" title="Llogaria">
          <View style={styles.settingRow}>
            <View style={styles.seasonIcon}>
              <Icon name="person" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{user?.displayName || user?.username || 'Administratori'}</AppText>
              <AppText variant="caption" numberOfLines={1}>
                {serverUrl.replace(/^https?:\/\//, '')}
              </AppText>
            </View>
          </View>
          <Separator />
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Sinkronizimi</AppText>
              <AppText variant="caption">
                {syncedAt ? `Përditësuar më ${formatDateTime(syncedAt)}` : 'Ende pa u sinkronizuar'}
              </AppText>
            </View>
            <Button
              label="Rifresko"
              icon="sync"
              variant="secondary"
              loading={syncBusy}
              onPress={() => runSync(() => sync({ force: true }))}
            />
          </View>
          <Button label="Dil nga llogaria" icon="logout" variant="dangerSoft" onPress={onSignOut} />
        </Section>

        <View style={styles.footer}>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            {peopleCount} persona · {ticketCount} fletëpagesa
          </AppText>
          <AppText variant="caption" style={{ textAlign: 'center', fontSize: 12 }}>
            Të dhënat ruhen në server dhe një kopje në këtë pajisje.
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.sectionTitle}>
        <Icon name={icon} size={16} color={colors.textMuted} />
        <AppText variant="label">{title}</AppText>
      </View>
      <Card style={{ gap: space.md }}>{children}</Card>
    </View>
  );
}

function Separator() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

/** Text setting that saves when the field loses focus. */
function TextSetting({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = draft.trim();
    if (v && v !== value) {
      onCommit(v);
      haptic.success();
    }
    setDraft(null);
  };
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption">{label}</AppText>
      <TextInput
        value={draft ?? value}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        returnKeyType="done"
        style={styles.textInput}
      />
    </View>
  );
}

function NumberSetting({
  label,
  hint,
  value,
  onCommit,
}: {
  label: string;
  hint: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft === null ? value : parseAmount(draft);
  const invalid = draft !== null && !(parsed > 0);
  const commit = () => {
    if (draft === null) return;
    if (parsed > 0 && parsed !== value) {
      onCommit(parsed);
      haptic.success();
    }
    setDraft(null);
  };
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" color={invalid ? colors.danger : undefined}>
          {invalid ? 'Shkruani një shumë më të madhe se 0' : hint}
        </AppText>
      </View>
      <View style={[styles.numberWrap, invalid && { borderColor: colors.danger }]}>
        <TextInput
          value={draft ?? String(value).replace('.', ',')}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          style={styles.numberInput}
        />
        <Text style={styles.numberEuro}>€</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.xl },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  textInput: {
    minHeight: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.text,
    fontWeight: font.medium,
  },
  numberWrap: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  numberInput: { width: 76, minHeight: 44, fontSize: 17, fontWeight: font.bold, color: colors.text, textAlign: 'right' },
  numberEuro: { fontSize: 16, color: colors.textMuted, fontWeight: font.semibold, marginLeft: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepperValue: { fontSize: 20, fontWeight: font.heavy, color: colors.text, minWidth: 56, textAlign: 'center' },
  seasonNow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  seasonIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.primarySoft, padding: space.md, borderRadius: radius.md },
  b: { fontWeight: font.bold },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  addInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: space.md,
    fontSize: 15,
    color: colors.text,
  },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  segmentItemActive: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  segmentText: { fontSize: 15, fontWeight: font.semibold, color: colors.textMuted },
  segmentTextActive: { color: colors.primaryDark },
  footer: { gap: 2, paddingTop: space.sm },
});

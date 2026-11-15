import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppText, Avatar } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';
import { formatDate, formatMoney, fullName } from '@/lib/format';
import { haptic } from '@/lib/platform';
import type { Person, Ticket } from '@/lib/types';
import { ticketDate, ticketTitle } from '@/store/selectors';

export function PersonRow({ person, onPress }: { person: Person; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar person={person} />
      <View style={styles.middle}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {fullName(person)}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          Babai: {person.fatherName || '—'}
        </AppText>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

export function TicketRow({
  ticket,
  seasonLabel,
  onPress,
  person,
}: {
  ticket: Ticket;
  seasonLabel: string;
  onPress: () => void;
  person?: Person;
}) {
  const paid = ticket.status === 'paid';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.ticketIcon, { backgroundColor: paid ? colors.successSoft : colors.warningSoft }]}>
        <Icon name={paid ? 'checkCircle' : 'clock'} size={20} color={paid ? colors.success : colors.warning} />
      </View>
      <View style={styles.middle}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {person ? fullName(person) : ticketTitle(ticket, seasonLabel)}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {formatDate(ticketDate(ticket))}
          {ticket.reasons.length ? ` · ${ticket.reasons.join(', ')}` : ''}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[styles.amount, !paid && { color: colors.warning }]}>{formatMoney(ticket.amount)}</Text>
        <Text style={[styles.amountSub, { color: paid ? colors.success : colors.warning }]}>
          {paid ? 'Paguar' : 'Pa paguar'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  middle: { flex: 1, gap: 2 },
  ticketIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 16, fontWeight: font.bold, color: colors.text },
  amountSub: { fontSize: 12, fontWeight: font.semibold },
});

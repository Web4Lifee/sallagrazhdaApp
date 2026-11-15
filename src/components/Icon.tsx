import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

type SymbolName = Exclude<ComponentProps<typeof SymbolView>['name'], string>;

/** SF Symbols on iOS, Material Symbols on Android and web. */
const ICONS = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  people: { ios: 'person.2.fill', android: 'group', web: 'group' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  personAdd: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  receipt: { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' },
  ticket: { ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' },
  print: { ios: 'printer.fill', android: 'print', web: 'print' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  euro: { ios: 'eurosign.circle.fill', android: 'euro', web: 'euro' },
  wallet: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
  flag: { ios: 'flag.fill', android: 'flag', web: 'flag' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  leaf: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  tag: { ios: 'tag.fill', android: 'sell', web: 'sell' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' },
  alert: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  note: { ios: 'text.alignleft', android: 'notes', web: 'notes' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 22, color = colors.text, style }: Props) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} style={style} />;
}

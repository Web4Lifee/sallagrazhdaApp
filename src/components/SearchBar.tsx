import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius, shadow, space } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Shows a spinner while the user is still typing (before the debounced search runs). */
  pending?: boolean;
};

export function SearchBar({ value, onChangeText, placeholder = 'Kërko me emër ose mbiemër', autoFocus, pending }: Props) {
  return (
    <View style={styles.wrap}>
      <Icon name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        style={styles.input}
      />
      {pending ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Pastro kërkimin" hitSlop={10} onPress={() => onChangeText('')} style={styles.clear}>
          <Icon name="close" size={14} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: space.md },
  clear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

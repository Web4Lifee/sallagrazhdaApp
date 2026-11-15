import type { ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { avatarPalette, colors, font, radius, shadow, space } from '@/constants/theme';
import { initials } from '@/lib/format';
import { haptic } from '@/lib/platform';
import type { Person } from '@/lib/types';
import type { SeasonStatus } from '@/store/selectors';

/* ---------- Text ---------- */

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';

export function AppText({
  variant = 'body',
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...props} style={[textStyles[variant], color ? { color } : null, style]} />;
}

const textStyles = StyleSheet.create({
  display: { fontSize: 34, fontWeight: font.heavy, color: colors.text, letterSpacing: -0.8 },
  title: { fontSize: 26, fontWeight: font.bold, color: colors.text, letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: font.bold, color: colors.text, letterSpacing: -0.2 },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  bodyStrong: { fontSize: 15, color: colors.text, fontWeight: font.semibold, lineHeight: 21 },
  caption: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: font.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

/* ---------- Card ---------- */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ---------- Button ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  icon?: IconName;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const buttonColors: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.primaryText },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primary },
  danger: { bg: colors.danger, fg: '#fff' },
  dangerSoft: { bg: colors.dangerSoft, fg: colors.danger },
};

export function Button({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const c = buttonColors[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={(e) => {
        haptic.tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        { backgroundColor: c.bg, borderColor: c.border ?? c.bg },
        variant === 'ghost' && { borderColor: 'transparent' },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        isDisabled && { opacity: 0.45 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} color={c.fg} /> : null}
          <Text style={[styles.buttonText, size === 'lg' && styles.buttonTextLg, { color: c.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.text,
  background = colors.surface,
  size = 42,
  label,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  background?: string;
  size?: number;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        background === colors.surface && styles.iconButtonBorder,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.35 },
      ]}>
      <Icon name={icon} size={size * 0.48} color={color} />
    </Pressable>
  );
}

/* ---------- Avatar ---------- */

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ person, size = 44 }: { person: Pick<Person, 'id' | 'firstName' | 'lastName'>; size?: number }) {
  const tone = avatarPalette[hash(person.id) % avatarPalette.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2.6, backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.fg, fontWeight: font.bold, fontSize: size * 0.36 }}>{initials(person)}</Text>
    </View>
  );
}

/* ---------- Badges & chips ---------- */

const statusMeta: Record<SeasonStatus, { label: string; bg: string; fg: string; icon: IconName }> = {
  paid: { label: 'Paguar', bg: colors.successSoft, fg: colors.success, icon: 'checkCircle' },
  unpaid: { label: 'Pa paguar', bg: colors.warningSoft, fg: colors.warning, icon: 'clock' },
  none: { label: 'Pa fletëpagesë', bg: colors.surfaceMuted, fg: colors.textMuted, icon: 'info' },
};

export function StatusBadge({ status, compact }: { status: SeasonStatus; compact?: boolean }) {
  const m = statusMeta[status];
  return (
    <View style={[styles.badge, { backgroundColor: m.bg }]}>
      <Icon name={m.icon} size={13} color={m.fg} />
      {!compact && <Text style={[styles.badgeText, { color: m.fg }]}>{m.label}</Text>}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  onRemove,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.35 },
      ]}>
      {selected ? <Icon name="check" size={15} color={colors.primary} /> : icon ? <Icon name={icon} size={15} color={colors.textMuted} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hiq ${label}`}
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            onRemove();
          }}
          style={styles.chipRemove}>
          <Icon name="close" size={13} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/* ---------- Inputs ---------- */

export function Field({
  label,
  error,
  hint,
  style,
  ref,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string; ref?: Ref<TextInputInstance> }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textFaint}
        {...props}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

/* ---------- Layout bits ---------- */

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {action}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" style={{ textAlign: 'center', maxWidth: 280 }}>
          {message}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonLg: { minHeight: 56, borderRadius: radius.lg },
  buttonText: { fontSize: 15, fontWeight: font.semibold },
  buttonTextLg: { fontSize: 16, fontWeight: font.bold },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconButtonBorder: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow.card },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: font.semibold },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text, fontWeight: font.medium },
  chipTextSelected: { color: colors.primaryDark, fontWeight: font.semibold },
  chipRemove: {
    marginLeft: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    fontSize: 16,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});

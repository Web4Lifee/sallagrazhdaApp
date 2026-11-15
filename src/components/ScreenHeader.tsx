import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, IconButton } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';

type Props = {
  title: string;
  subtitle?: string;
  mode?: 'back' | 'close';
  right?: ReactNode;
  onBack?: () => void;
};

/** Header for stack screens (outside the tabs). */
export function ScreenHeader({ title, subtitle, mode = 'back', right, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const handleBack = onBack ?? goBack;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.sm }]}>
      <IconButton icon={mode === 'close' ? 'close' : 'back'} label="Kthehu" onPress={handleBack} />
      <View style={styles.titles}>
        <AppText variant="heading" numberOfLines={1} style={{ textAlign: 'center' }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1} style={{ textAlign: 'center' }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.bg,
    gap: space.md,
  },
  titles: { flex: 1, alignItems: 'center' },
  right: { minWidth: 42, flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
});

import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { colors, font, space } from '@/constants/theme';
import { haptic } from '@/lib/platform';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Ballina', icon: 'home' },
  payments: { label: 'Pagesat', icon: 'people' },
  settings: { label: 'Cilësimet', icon: 'settings' },
};

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** Floating dark bottom navigation with an amber pill on the active tab. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.outer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const tint = focused ? colors.primaryDark : colors.navMuted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptic.tap();
                  navigateToTab(route.key);
                }
              }}
              style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && !focused && styles.itemPressed]}>
              <Icon name={meta.icon} size={21} color={tint} />
              <Text style={[styles.label, { color: tint }, focused && styles.labelActive]} numberOfLines={1}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const barShadow = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#06140C',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  android: { elevation: 16 },
  default: { boxShadow: '0 12px 32px rgba(6, 20, 12, 0.32)' },
});

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.nav,
    borderRadius: 28,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...barShadow,
  },
  item: {
    flex: 1,
    height: 50,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemActive: { backgroundColor: colors.accent },
  itemPressed: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  label: { fontSize: 11, fontWeight: font.medium, letterSpacing: 0.1 },
  labelActive: { fontWeight: font.bold },
});

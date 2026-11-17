import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, space } from '@/constants/theme';

/**
 * Splash image width (app.json, expo-splash-screen "imageWidth") × the badge's share of
 * splash-icon.png (520 of 1024 px), so the badge here sits exactly where the native splash drew it.
 */
const BADGE_SIZE = Math.round((200 * 520) / 1024);

/**
 * Shown while the app starts: the login screen's leaf badge, the app name and a spinner. It matches
 * the native splash screen (same background, badge size and position), so hiding the splash on
 * layout swaps them without a jump. Uses an image instead of <Icon>, whose font may still be loading.
 */
export function LoadingScreen({ onLayout }: { onLayout?: (event: LayoutChangeEvent) => void }) {
  return (
    <View style={styles.screen} onLayout={onLayout}>
      <Image
        source={require('../../assets/images/app-mark.png')}
        style={styles.badge}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.below}>
        <AppText variant="heading" style={styles.title}>
          Mirëmbajtja e Oborrit
        </AppText>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Duke u ngarkuar" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  badge: { width: BADGE_SIZE, height: BADGE_SIZE },
  // Below the centred badge, without moving it off centre.
  below: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: BADGE_SIZE / 2 + space.xl,
    alignItems: 'center',
    gap: space.lg,
  },
  title: { textAlign: 'center' },
});

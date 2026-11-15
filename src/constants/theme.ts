import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#F3F5F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8F5',
  border: '#E3E8E2',
  borderStrong: '#CBD3CA',

  text: '#122019',
  textMuted: '#66756C',
  textFaint: '#9AA59E',

  primary: '#1E7A4C',
  primaryDark: '#0F4F30',
  primarySoft: '#E2F1E8',
  primaryText: '#FFFFFF',

  accent: '#F2B441',
  accentSoft: '#FDF3DD',

  success: '#1E9D57',
  successSoft: '#E1F5E9',
  warning: '#C97A0A',
  warningSoft: '#FDF0DC',
  danger: '#D2483B',
  dangerSoft: '#FBE7E4',

  overlay: 'rgba(10, 25, 17, 0.45)',

  nav: '#123524',
  navMuted: 'rgba(255, 255, 255, 0.62)',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const font = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B2416',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 6px 18px rgba(11, 36, 22, 0.07)' },
  }),
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B2416',
      shadowOpacity: 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 10 },
    default: { boxShadow: '0 10px 30px rgba(11, 36, 22, 0.16)' },
  }),
};

/** Space reserved at the bottom of tab screens so content clears the floating tab bar. */
export const TAB_BAR_SPACE = 96;

/** Soft avatar palette, picked deterministically per person. */
export const avatarPalette = [
  { bg: '#E2F1E8', fg: '#1E7A4C' },
  { bg: '#FDF0DC', fg: '#B26A05' },
  { bg: '#E6EEFB', fg: '#2F5FB3' },
  { bg: '#F6E6F1', fg: '#A33C7E' },
  { bg: '#E7F4F6', fg: '#1F7F8C' },
  { bg: '#EFE9FB', fg: '#6545B5' },
] as const;

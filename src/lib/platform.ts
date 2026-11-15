import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

export const haptic = {
  tap: () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning: () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  destructive?: boolean;
};

/** Cross-platform confirmation dialog (Alert on native, window.confirm on web). */
export function confirm({ title, message, confirmText = 'OK', destructive }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.([title, message].filter(Boolean).join('\n\n')) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Anulo', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') globalThis.alert?.([title, message].filter(Boolean).join('\n\n'));
  else Alert.alert(title, message);
}

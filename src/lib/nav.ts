import { router } from 'expo-router';

/** Go back if there is history, otherwise land on the home tab. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Ballina' }} />
      <Tabs.Screen name="payments" options={{ title: 'Pagesat' }} />
      <Tabs.Screen name="settings" options={{ title: 'Cilësimet' }} />
    </Tabs>
  );
}

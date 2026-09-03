import { Tabs } from 'expo-router';
import { Bell, ChartNoAxesCombined, House, MapPinned, UserRound } from 'lucide-react-native';

const colors = {
  ink: '#102A43',
  muted: '#829AB1',
  accent: '#18A999',
  surface: '#FFFFFF',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: '#E6EEF4',
          height: 74,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Live map', tabBarIcon: ({ color, size }) => <MapPinned color={color} size={size} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
    </Tabs>
  );
}

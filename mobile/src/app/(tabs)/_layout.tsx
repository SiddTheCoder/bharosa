import { Tabs } from 'expo-router';
import { ContactRound, Home, ListChecks, UserRound } from 'lucide-react-native';

import { AppTabBar } from '@/components/AppTabBar';
import { color } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.g700,
        tabBarInactiveTintColor: color.faint,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: tint }) => <Home color={tint} size={23} strokeWidth={1.9} />,
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: 'Passport',
          tabBarIcon: ({ color: tint }) => <ContactRound color={tint} size={23} strokeWidth={1.9} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color: tint }) => <ListChecks color={tint} size={23} strokeWidth={1.9} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color: tint }) => <UserRound color={tint} size={23} strokeWidth={1.9} />,
        }}
      />
    </Tabs>
  );
}

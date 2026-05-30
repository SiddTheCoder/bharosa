import { ContactRound, Home, ListChecks, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font } from '@/constants/theme';

type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, { options: { title?: string; tabBarLabel?: unknown } }>;
  navigation: {
    emit: (event: any) => any;
    navigate: (name: string) => void;
  };
};

const icons = {
  index: Home,
  passport: ContactRound,
  activity: ListChecks,
  profile: UserRound,
} as const;

export function AppTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = typeof options?.tabBarLabel === 'string' ? options.tabBarLabel : options?.title ?? route.name;
          const Icon = icons[route.name as keyof typeof icons] ?? Home;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={[styles.iconShell, focused && styles.iconShellOn]}>
                <Icon size={19} color={focused ? color.g700 : color.faint} strokeWidth={2} />
              </View>
              <Text style={[styles.label, focused && styles.labelOn]}>{String(label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: color.hair,
    paddingTop: 8,
    paddingHorizontal: 18,
  },
  tabs: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  item: {
    width: 68,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  iconShell: {
    width: 36,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconShellOn: {
    backgroundColor: color.g50,
  },
  label: {
    color: color.faint,
    fontFamily: font.bold,
    fontSize: 10.5,
  },
  labelOn: {
    color: color.g700,
  },
});

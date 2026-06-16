import { Tabs, router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '@/constants/theme';
import {
  HOME_SVG,
  SEARCH_SVG,
  SAVED_SVG,
  PROFILE_SVG,
  PLUS_SVG,
} from '@/constants/navbarIcons';

// The brand navbar SVGs carry their own fills, so active/inactive state is
// conveyed with opacity rather than tinting.
const INACTIVE_OPACITY = 0.4;

function TabIcon({ xml, size, focused }: { xml: string; size: number; focused: boolean }) {
  return (
    <View style={{ opacity: focused ? 1 : INACTIVE_OPACITY }}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    position: 'absolute',
    top: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenTabBar: {
    display: 'none',
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon xml={HOME_SVG} size={24} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <TabIcon xml={SEARCH_SVG} size={24} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-review"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push({
              pathname: '/search-cafes',
              params: { mode: 'review' },
            });
          },
        }}
        options={{
          title: '',
          tabBarStyle: styles.hiddenTabBar,
          tabBarIcon: () => (
            <View style={styles.addButtonContainer}>
              <SvgXml xml={PLUS_SVG} width={40} height={40} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Lists',
          tabBarIcon: ({ focused }) => (
            <TabIcon xml={SAVED_SVG} size={24} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon xml={PROFILE_SVG} size={24} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

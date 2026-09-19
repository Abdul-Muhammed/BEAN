import { Tabs, router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, radius, spacing } from '@/constants/theme';
import {
  NAV_BOOKMARK_SVG,
  NAV_HOUSE_SVG,
  NAV_PLUS_SVG,
  NAV_SEARCH_SVG,
  NAV_USER_SVG,
} from '@/constants/figmaIcons';

// The nav glyphs carry their own stroke colour, so active and inactive state is
// conveyed with opacity rather than by shipping a second exported copy of each.
const INACTIVE_OPACITY = 0.4;

function TabIcon({ xml, focused }: { xml: string; focused: boolean }) {
  return (
    <View style={{ opacity: focused ? 1 : INACTIVE_OPACITY }}>
      <SvgXml xml={xml} width={24} height={24} />
    </View>
  );
}

/** The centre action: an ink circle with the plus reversed out of it. */
function AddButton() {
  return (
    <View style={styles.addButton}>
      <SvgXml xml={NAV_PLUS_SVG} width={24} height={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    // The frame draws no rule above the bar; the bottom safe-area inset
    // provides the separation from the home indicator.
    borderTopWidth: 0,
    elevation: 0,
  },
  addButton: {
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
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
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarItemStyle: { height: 40 },
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
          tabBarIcon: ({ focused }) => <TabIcon xml={NAV_HOUSE_SVG} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon xml={NAV_SEARCH_SVG} focused={focused} />,
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
          tabBarIcon: () => <AddButton />,
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Lists',
          tabBarIcon: ({ focused }) => <TabIcon xml={NAV_BOOKMARK_SVG} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon xml={NAV_USER_SVG} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

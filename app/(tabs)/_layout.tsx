import { Tabs, router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, radius, spacing } from '@/constants/theme';
import {
  NAV_BOOKMARK_FILLED_SVG,
  NAV_BOOKMARK_SVG,
  NAV_HOUSE_OUTLINE_SVG,
  NAV_HOUSE_SVG,
  NAV_PLUS_SVG,
  NAV_SEARCH_FILLED_SVG,
  NAV_SEARCH_SVG,
  NAV_USER_FILLED_SVG,
  NAV_USER_SVG,
} from '@/constants/figmaIcons';

// The selected tab shows its filled glyph and the others their outline. The
// unselected tabs are also dimmed.
const INACTIVE_OPACITY = 0.4;

function TabIcon({
  active,
  inactive,
  focused,
}: {
  active: string;
  inactive: string;
  focused: boolean;
}) {
  return (
    <View style={{ opacity: focused ? 1 : INACTIVE_OPACITY }}>
      <SvgXml xml={focused ? active : inactive} width={24} height={24} />
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
      }}
    >
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
            <TabIcon
              active={NAV_HOUSE_SVG}
              inactive={NAV_HOUSE_OUTLINE_SVG}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              active={NAV_SEARCH_FILLED_SVG}
              inactive={NAV_SEARCH_SVG}
              focused={focused}
            />
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
          tabBarIcon: () => <AddButton />,
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Lists',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              active={NAV_BOOKMARK_FILLED_SVG}
              inactive={NAV_BOOKMARK_SVG}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              active={NAV_USER_FILLED_SVG}
              inactive={NAV_USER_SVG}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

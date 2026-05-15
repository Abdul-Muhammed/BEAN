import { Tabs, router } from 'expo-router';
import { Home, Search, Plus, Bookmark, User } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

const styles = StyleSheet.create({
  addButtonContainer: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
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
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Lato-Regular',
        },
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
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Search',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} />
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
              <View style={styles.addButton}>
                <Plus size={28} color={colors.white} strokeWidth={3} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Saved',
          tabBarIcon: ({ size, color }) => (
            <Bookmark size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
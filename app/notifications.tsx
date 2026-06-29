import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  getFollowNotifications,
  type FollowNotification,
} from '../lib/follows';
import {
  getNotificationsLastSeen,
  setNotificationsLastSeenNow,
} from '../lib/notifications';

/** Compact relative time: now / Xm / Xh / Xd / Xw. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return `${Math.floor(day / 7)}w`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<FollowNotification[]>([]);
  // Snapshot of last-seen captured before we mark the screen as seen, so the
  // beige "unread" styling reflects what arrived since the previous visit.
  const [lastSeen, setLastSeen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const seen = await getNotificationsLastSeen();
      const items = await getFollowNotifications();
      setLastSeen(seen);
      setNotifications(items);
      setError(null);
      // Mark everything read for the next visit.
      await setNotificationsLastSeenNow();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load notifications');
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadNotifications();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const renderItem = ({ item }: { item: FollowNotification }) => {
    const { user } = item;
    const unread = new Date(item.createdAt).getTime() > lastSeen;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.row, { backgroundColor: unread ? '#F6F3EF' : '#FFFEFB' }]}
        onPress={() =>
          router.push({ pathname: '/user/[id]', params: { id: user.id } })
        }
      >
        {user.profile_image_url ? (
          <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.text} numberOfLines={1}>
          @{user.username} followed you
        </Text>

        <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
        {unread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFEFB" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1C1C1E" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.user.id}
          renderItem={renderItem}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContainer : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1C1C1E"
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {error ?? 'No notifications yet'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  // Lets the empty/error ListEmptyComponent fill the screen so it centers and
  // the pull-to-refresh gesture stays available with no rows.
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  avatarPlaceholder: {
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#FFFFFF',
  },
  text: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Regular',
    color: '#474747',
  },
  time: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#474747',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1C1C1E',
    marginLeft: 4,
  },
});

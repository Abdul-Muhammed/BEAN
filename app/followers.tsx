import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import ConnectionsHeader from '../components/social/ConnectionsHeader';
import SocialSearchBar from '../components/social/SocialSearchBar';
import UserListRow from '../components/social/UserListRow';
import { getFollowers, PublicUser } from '../lib/follows';
import { colors } from '@/constants/theme';

function matches(user: PublicUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').toLowerCase();
  return user.username.toLowerCase().includes(q) || name.includes(q);
}

export default function FollowersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!user?.id) return;
      setLoading(true);
      getFollowers(user.id)
        .then((data) => {
          if (!cancelled) setUsers(data);
        })
        .catch((err) => console.warn('Failed to load followers:', err))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  const visible = useMemo(
    () => users.filter((u) => matches(u, query)),
    [users, query]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ConnectionsHeader title="Followers" />
      <SocialSearchBar value={query} onChangeText={setQuery} />

      {loading ? (
        <ActivityIndicator size="large" color="#1C1C1E" style={styles.loader} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          // Everyone here follows the signed-in user, so the button reads
          // "Follow Back" until it's mutual.
          renderItem={({ item }) => <UserListRow user={item} theyFollowMe />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim() ? 'No users found.' : 'No followers yet.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    marginVertical: 60,
  },
  empty: {
    marginTop: 60,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
});

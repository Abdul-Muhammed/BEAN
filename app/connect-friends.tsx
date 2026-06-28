import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import ConnectionsHeader from '../components/social/ConnectionsHeader';
import SocialSearchBar from '../components/social/SocialSearchBar';
import UserListRow from '../components/social/UserListRow';
import { useToast } from '../context/ToastContext';
import { searchProfiles, getRecommended, PublicUser } from '../lib/follows';
import { colors } from '@/constants/theme';

/** Static black "find people you know" card. Contacts sync isn't wired up yet,
 *  so the button just acknowledges with a toast. */
function SyncContactsCard() {
  const { showToast } = useToast();
  return (
    <View style={styles.syncCard}>
      <View style={styles.syncBody}>
        <Text style={styles.syncTitle}>Find people you know</Text>
        <Text style={styles.syncSubtitle}>
          Sync contacts to see who's already hopping through cafes
        </Text>
      </View>
      <TouchableOpacity
        style={styles.syncButton}
        activeOpacity={0.85}
        onPress={() =>
          showToast({ variant: 'saved', message: 'Contact sync is coming soon.' })
        }
      >
        <Text style={styles.syncButtonText}>Sync Contacts</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ConnectFriendsScreen() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [recommended, setRecommended] = useState<PublicUser[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  const isSearching = debounced.trim().length > 0;

  // Debounce the query (300ms).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Run the search whenever the debounced query changes.
  useEffect(() => {
    let cancelled = false;
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchProfiles(q)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => console.warn('Search failed:', err))
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // Load recommendations on focus (so newly-followed users drop off).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadingRecs(true);
      getRecommended()
        .then((data) => {
          if (!cancelled) setRecommended(data);
        })
        .catch((err) => console.warn('Failed to load recommendations:', err))
        .finally(() => {
          if (!cancelled) setLoadingRecs(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const data = isSearching ? results : recommended;

  const header = (
    <>
      <SyncContactsCard />
      {!isSearching && recommended.length > 0 ? (
        <Text style={styles.sectionTitle}>Recommended</Text>
      ) : null}
    </>
  );

  const renderEmpty = () => {
    if (isSearching) {
      if (searching) return null;
      return <Text style={styles.empty}>No users found.</Text>;
    }
    if (loadingRecs) {
      return <ActivityIndicator size="large" color="#1C1C1E" style={styles.loader} />;
    }
    // No recommendations -> the section is simply hidden (no empty text).
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ConnectionsHeader title="Connect with friends" />
      <SocialSearchBar value={query} onChangeText={setQuery} />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserListRow user={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 40,
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1312',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    gap: 12,
  },
  syncBody: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
  syncSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#B0B0B5',
    lineHeight: 18,
  },
  syncButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncButtonText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#0F1312',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
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

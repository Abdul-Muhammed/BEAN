import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ListCafeCard from '../../components/ListCafeCard';
import { useReviews } from '../../context/ReviewContext';
import { Cafe } from '../../data/mockData';
import { colors, fonts } from '@/constants/theme';

const LIST_TITLES: Record<string, string> = {
  bookmarks: 'Cafes I Want To Try',
  favorites: 'My Favorites',
  diary: "Where I've Bean",
};

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookmarkedCafes, favoritedCafes, userReviews, getCafeById } = useReviews();

  const listId = Array.isArray(id) ? id[0] : id || '';
  const title = LIST_TITLES[listId] || 'List';

  // "Where I've Bean" resolves the unique reviewed cafes; the others map
  // directly onto the derived arrays from ReviewContext.
  const diaryCafes = useMemo<Cafe[]>(() => {
    const seen = new Set<string>();
    const result: Cafe[] = [];
    for (const review of userReviews) {
      if (seen.has(review.cafeId)) continue;
      seen.add(review.cafeId);
      const cafe = getCafeById(review.cafeId);
      if (cafe) result.push(cafe);
    }
    return result;
  }, [userReviews, getCafeById]);

  const cafes: Cafe[] =
    listId === 'favorites'
      ? favoritedCafes
      : listId === 'diary'
      ? diaryCafes
      : bookmarkedCafes;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cafes.length > 0 ? (
          cafes.map((cafe) => <ListCafeCard key={cafe.id} cafe={cafe} />)
        ) : (
          <Text style={styles.emptyHint}>No cafes in this list yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorder,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 40,
  },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 40,
  },
});

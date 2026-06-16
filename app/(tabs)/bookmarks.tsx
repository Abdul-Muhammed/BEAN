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
import { Plus, ChevronRight } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { useRouter } from 'expo-router';
import ListCafeCard from '../../components/ListCafeCard';
import CollectionCard from '../../components/CollectionCard';
import { useReviews } from '../../context/ReviewContext';
import { colors, fonts } from '@/constants/theme';
import { FAVORITES_SVG, DIARY_SVG, BOOKMARKS_SVG } from '@/constants/savedScreenIcons';

const PREVIEW_COUNT = 3;

export default function ListsScreen() {
  const { bookmarkedCafes, favoritedCafeIds, favoritedCafes, userReviews } =
    useReviews();
  const router = useRouter();

  // "Where I've Bean" = the unique cafes the user has reviewed. Reviews carry a
  // cafe image/name snapshot, so the collage is always image-rich.
  const diaryCafes = useMemo(() => {
    const seen = new Map<string, { id: string; image: string }>();
    for (const review of userReviews) {
      if (!seen.has(review.cafeId)) {
        seen.set(review.cafeId, { id: review.cafeId, image: review.cafeImage });
      }
    }
    return Array.from(seen.values());
  }, [userReviews]);

  const previewCafes = bookmarkedCafes.slice(0, PREVIEW_COUNT);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lists</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/list/create')}
          hitSlop={8}
        >
          <Plus size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1 — user list */}
        <TouchableOpacity
          style={styles.listRow}
          onPress={() => router.push({ pathname: '/list/[id]', params: { id: 'bookmarks' } })}
          activeOpacity={0.7}
        >
          <View style={styles.listRowLeft}>
            <SvgXml xml={BOOKMARKS_SVG} width={32} height={24} />
            <Text style={styles.listRowTitle}>Cafes I Want To Try</Text>
          </View>
          <ChevronRight size={22} color={colors.mutedText} />
        </TouchableOpacity>

        {previewCafes.length > 0 ? (
          previewCafes.map((cafe) => <ListCafeCard key={cafe.id} cafe={cafe} />)
        ) : (
          <Text style={styles.emptyHint}>No cafes yet — start saving.</Text>
        )}

        <View style={styles.divider} />

        {/* Collections */}
        <CollectionCard
          title="My Favorites"
          count={favoritedCafeIds.length}
          images={favoritedCafes.map((c) => c.image).filter(Boolean)}
          icon={<SvgXml xml={FAVORITES_SVG} width={32} height={24} />}
          onPress={() => router.push({ pathname: '/list/[id]', params: { id: 'favorites' } })}
        />

        <CollectionCard
          title="Where I've Bean"
          count={diaryCafes.length}
          images={diaryCafes.map((c) => c.image).filter(Boolean)}
          icon={<SvgXml xml={DIARY_SVG} width={32} height={24} />}
          onPress={() => router.push({ pathname: '/list/[id]', params: { id: 'diary' } })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorder,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warmBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  listRowTitle: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.mutedText,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.warmBorder,
    marginVertical: 28,
  },
});

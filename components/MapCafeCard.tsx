import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Bookmark } from 'lucide-react-native';
import { CoffeeBean } from './BeanRating';
import { Cafe } from '../data/mockData';
import { useReviews } from '../context/ReviewContext';
import CafeStatusBadges, { type CafeBadgeKind } from './CafeStatusBadges';
import CafeTagChips from './CafeTagChips';
import { colors } from '@/constants/theme';

const DEFAULT_CAFE_IMAGE =
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800';

interface MapCafeCardProps {
  cafe: Cafe;
  /** Suppress badges whose state the surrounding list already implies. */
  hideBadges?: CafeBadgeKind[];
}

function MapCafeCard({ cafe, hideBadges }: MapCafeCardProps) {
  const { toggleBookmark, isBookmarked } = useReviews();
  const [imageFailed, setImageFailed] = React.useState(false);

  const preferredUri = cafe.photos?.[0] || cafe.image || DEFAULT_CAFE_IMAGE;
  const imageUri = imageFailed ? DEFAULT_CAFE_IMAGE : preferredUri;

  // A fresh image source (e.g. after lazy enrichment) gets another chance to load.
  React.useEffect(() => {
    setImageFailed(false);
  }, [preferredUri]);

  const handlePress = () => {
    router.push(`/cafe/${cafe.id}`);
  };

  const handleBookmarkPress = (e: any) => {
    e.stopPropagation();
    toggleBookmark(cafe.id);
  };

  // Extract location (suburb or city)
  const extractLocation = (address: string): string => {
    const parts = address.split(',');
    if (parts.length > 1) {
      const suburb = parts[parts.length - 2]?.trim();
      if (suburb && !suburb.includes('Auckland')) {
        return suburb;
      }
    }
    return 'Auckland';
  };

  const location = extractLocation(cafe.location);
  const isBooked = isBookmarked(cafe.id);

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity style={styles.card} onPress={handlePress}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          onError={() => setImageFailed(true)}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{cafe.name}</Text>
            <TouchableOpacity
              style={styles.bookmarkButton}
              onPress={handleBookmarkPress}
            >
              <Bookmark
                size={20}
                color={isBooked ? '#D4AF37' : '#8E8E93'}
                fill={isBooked ? '#D4AF37' : 'transparent'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#8E8E93" />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          </View>

          <View style={styles.footer}>
            <CafeTagChips tags={cafe.tags} style={styles.amenitiesRow} />

            <View style={styles.ratingRow}>
              <CoffeeBean size={16} />
              <Text style={styles.ratingText}>{cafe.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <CafeStatusBadges cafeId={cafe.id} hide={hideBadges} />
    </View>
  );
}

export default React.memo(MapCafeCard);

const styles = StyleSheet.create({
  // Padding reserves room for the status badge to overhang the card's corner.
  // The card itself clips its children, so the badge has to live out here.
  cardWrapper: {
    paddingTop: 12,
    paddingLeft: 12,
    // Bleed back into the sheet's 20px horizontal padding so the card keeps its
    // original width and left edge; the reclaimed 12px is where the badge sits.
    marginLeft: -12,
    // The card's old marginBottom moves here as the wrapper's paddingTop, so
    // the gap between cards is unchanged.
    marginBottom: 0,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E3E3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E5EA',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    marginRight: 8,
  },
  bookmarkButton: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
});


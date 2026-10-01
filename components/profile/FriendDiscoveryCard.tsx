import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CHEVRON_RIGHT_LIGHT_SVG } from '@/constants/figmaIcons';
import { getRecommended, type PublicUser } from '../../lib/follows';
import { colors, radius, spacing, type } from '@/constants/theme';

interface FriendDiscoveryCardProps {
  onPress?: () => void;
}

/** How many overlapping avatars the frame shows. */
const AVATAR_COUNT = 3;

/**
 * The dark "connect with friends" prompt. The avatar stack and the count are
 * real recommended profiles rather than decoration, so the card does not
 * promise people who are not there.
 */
export default function FriendDiscoveryCard({ onPress }: FriendDiscoveryCardProps) {
  const [people, setPeople] = useState<PublicUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    getRecommended()
      .then((rows) => {
        if (!cancelled) setPeople(rows);
      })
      .catch(() => {
        /* Non-fatal: the card falls back to its generic subtitle. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avatars = people.slice(0, AVATAR_COUNT);
  const subtitle =
    people.length > 0
      ? `${people.length} ${people.length === 1 ? 'person' : 'people'} you may know ${
          people.length === 1 ? 'is' : 'are'
        } here`
      : 'Find the people you drink coffee with';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Connect with friends"
    >
      {avatars.length > 0 && (
        <View style={styles.avatars}>
          {avatars.map((person, index) =>
            person.profile_image_url ? (
              <Image
                key={person.id}
                source={{ uri: person.profile_image_url }}
                style={[styles.avatar, index > 0 && styles.avatarOverlap]}
              />
            ) : (
              <View
                key={person.id}
                style={[styles.avatar, styles.avatarFallback, index > 0 && styles.avatarOverlap]}
              />
            )
          )}
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title}>Connect with friends</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <SvgXml xml={CHEVRON_RIGHT_LIGHT_SVG} width={24} height={24} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cream,
    backgroundColor: colors.greyNormal,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarFallback: {
    backgroundColor: colors.accent,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...type.title1,
    color: colors.cream,
  },
  subtitle: {
    ...type.footnote1,
    color: colors.greyExtraLight,
  },
});

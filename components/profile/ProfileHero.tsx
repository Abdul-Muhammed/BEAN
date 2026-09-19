import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { PENCIL_SVG } from '@/constants/figmaIcons';
import { colors, radius, softShadow, spacing, type } from '@/constants/theme';

interface ProfileHeroProps {
  username: string;
  fullName: string;
  bio: string | null;
  joinedLabel: string;
  profileImageUrl?: string | null;
  followingCount: number;
  followersCount: number;
  onPressEdit?: () => void;
  onPressFollowing?: () => void;
  onPressFollowers?: () => void;
  /** Hidden when viewing another user's profile. */
  showEditButton?: boolean;
}

function Stat({
  value,
  label,
  onPress,
}: {
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.stat}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Centred identity block: an 80pt avatar carrying the edit badge, then the
 * handle, bio and join date, then the follow counts.
 */
export default function ProfileHero({
  username,
  fullName,
  bio,
  joinedLabel,
  profileImageUrl,
  followingCount,
  followersCount,
  onPressEdit,
  onPressFollowing,
  onPressFollowers,
  showEditButton = true,
}: ProfileHeroProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        {profileImageUrl ? (
          <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(fullName || username).replace('@', '').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {showEditButton && (
          <TouchableOpacity
            style={styles.editBadge}
            onPress={onPressEdit}
            activeOpacity={0.85}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <SvgXml xml={PENCIL_SVG} width={12} height={12} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.identity}>
        <Text style={styles.username}>{username}</Text>
        {bio ? (
          <Text style={styles.bio}>{bio}</Text>
        ) : showEditButton ? (
          <Text style={[styles.bio, styles.bioEmpty]}>Add a short bio</Text>
        ) : null}
        {!!joinedLabel && <Text style={styles.joined}>{joinedLabel}</Text>}
      </View>

      <View style={styles.statsRow}>
        <Stat value={followingCount} label="Following" onPress={onPressFollowing} />
        <Stat value={followersCount} label="Followers" onPress={onPressFollowers} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  avatarWrap: {
    width: 80,
    height: 80,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cream,
    backgroundColor: colors.greyExtraLight,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  avatarInitial: {
    ...type.h1,
    fontSize: 32,
    color: colors.background,
  },
  editBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...softShadow,
  },
  identity: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    alignSelf: 'stretch',
  },
  username: {
    ...type.h1,
    color: colors.ink,
    textAlign: 'center',
  },
  bio: {
    ...type.body1,
    color: colors.ink,
    textAlign: 'center',
  },
  bioEmpty: {
    color: colors.greyNormal,
    fontStyle: 'italic',
  },
  joined: {
    ...type.footnote1,
    color: colors.greyNormal,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'stretch',
  },
  stat: {
    gap: spacing.xs,
  },
  statValue: {
    ...type.title1,
    color: colors.ink,
    textAlign: 'center',
  },
  statLabel: {
    ...type.footnote1,
    color: colors.greyNormal,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { EDIT_PENCIL_SVG } from '@/constants/profileIcons';
import { colors } from '@/constants/theme';

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

/** Centered identity block: avatar (with edit pencil), name/handle/bio/join date,
 *  and tappable follow stats. Follow counts are placeholders for now (no social
 *  graph exists yet). */
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
            style={styles.editButton}
            onPress={onPressEdit}
            activeOpacity={0.85}
            hitSlop={8}
          >
            <SvgXml xml={EDIT_PENCIL_SVG} width={40} height={40} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.username}>{username}</Text>
      {bio ? (
        <Text style={styles.bio}>{bio}</Text>
      ) : (
        <Text style={[styles.bio, styles.bioEmpty]}>Add a short bio</Text>
      )}
      <Text style={styles.joined}>{joinedLabel}</Text>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.stat}
          onPress={onPressFollowing}
          activeOpacity={0.7}
        >
          <Text style={styles.statValue}>{followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.stat}
          onPress={onPressFollowers}
          activeOpacity={0.7}
        >
          <Text style={styles.statValue}>{followersCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  avatarWrap: {
    width: 104,
    height: 104,
    marginBottom: 14,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F2F2F7',
  },
  avatarPlaceholder: {
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 42,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#FFFFFF',
  },
  editButton: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 20,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  bio: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#3A3A3C',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  bioEmpty: {
    color: '#B0B0B5',
    fontStyle: 'italic',
  },
  joined: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E5E5EA',
  },
});

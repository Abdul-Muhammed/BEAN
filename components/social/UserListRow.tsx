import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FollowButton from './FollowButton';
import { PublicUser } from '../../lib/follows';

interface UserListRowProps {
  user: PublicUser;
  /** Pass true on the Followers screen so the button reads "Follow Back". */
  theyFollowMe?: boolean;
}

function displayName(user: PublicUser): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.username;
}

/** A single ~72px user row: avatar, name + @username, follow button, divider.
 *  Tapping the row (outside the button) opens that user's profile. */
export default function UserListRow({ user, theyFollowMe }: UserListRowProps) {
  const router = useRouter();
  const name = displayName(user);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}
    >
      {user.profile_image_url ? (
        <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {name.replace('@', '').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{user.username}
        </Text>
      </View>

      <FollowButton
        targetId={user.id}
        username={user.username}
        theyFollowMe={theyFollowMe}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  avatarPlaceholder: {
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  username: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
  },
});

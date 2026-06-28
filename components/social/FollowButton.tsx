import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useFollows } from '../../context/FollowContext';
import ConfirmationModal from '../settings/ConfirmationModal';

interface FollowButtonProps {
  targetId: string;
  /** Username (without @) used in the unfollow confirmation title. */
  username?: string;
  /** Whether this user already follows the signed-in user. Controls the
   *  "Follow" vs "Follow Back" label when not yet following them back. */
  theyFollowMe?: boolean;
  style?: ViewStyle;
}

/** Follow / Follow Back / Following button backed by FollowContext. Tapping
 *  "Following" asks for confirmation before unfollowing. */
export default function FollowButton({
  targetId,
  username,
  theyFollowMe = false,
  style,
}: FollowButtonProps) {
  const { isFollowing, toggleFollow } = useFollows();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const following = isFollowing(targetId);

  const handlePress = () => {
    if (following) {
      setConfirmVisible(true);
    } else {
      toggleFollow(targetId);
    }
  };

  const handleConfirmUnfollow = () => {
    setConfirmVisible(false);
    toggleFollow(targetId);
  };

  const label = following ? 'Following' : theyFollowMe ? 'Follow Back' : 'Follow';

  return (
    <>
      <TouchableOpacity
        style={[styles.button, following ? styles.outlined : styles.filled, style]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={following ? styles.outlinedText : styles.filledText}>
          {label}
        </Text>
      </TouchableOpacity>

      <ConfirmationModal
        visible={confirmVisible}
        title={`Unfollow @${username || 'user'}?`}
        message="You'll stop seeing their activity and will need to follow them again."
        confirmLabel="Unfollow"
        cancelLabel="Cancel"
        onConfirm={handleConfirmUnfollow}
        onCancel={() => setConfirmVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 96,
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: '#0F1312',
  },
  outlined: {
    backgroundColor: '#FFFEFB',
    borderWidth: 1,
    borderColor: '#0F1312',
  },
  filledText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#FFFEFB',
  },
  outlinedText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: '#0F1312',
  },
});

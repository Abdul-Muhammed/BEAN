import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface FriendDiscoveryCardProps {
  count?: number;
  onPress?: () => void;
}

// Placeholder avatar tints for the overlapping stack. The social graph doesn't
// exist yet, so these are purely decorative for now.
const AVATAR_COLORS = ['#C9824B', '#6B8E72', '#8D6FB0'];

/** Full-width dark "connect with friends" prompt. UI-only for now — there's no
 *  people-you-may-know data behind it yet. */
export default function FriendDiscoveryCard({
  count = 12,
  onPress,
}: FriendDiscoveryCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.avatars}>
        {AVATAR_COLORS.map((color, i) => (
          <View
            key={i}
            style={[
              styles.avatar,
              { backgroundColor: color, marginLeft: i === 0 ? 0 : -12 },
            ]}
          />
        ))}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Connect with friends</Text>
        <Text style={styles.subtitle}>{count} people you may know are here</Text>
      </View>
      <ChevronRight size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1312',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#B0B0B5',
  },
});

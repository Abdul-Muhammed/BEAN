import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface ConnectionsHeaderProps {
  title: string;
}

/** Standard nav bar for the connections screens: back arrow (left), centered
 *  title. Mirrors ProfileHeader's sizing. */
export default function ConnectionsHeader({ title }: ConnectionsHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.back()}
        hitSlop={10}
        activeOpacity={0.7}
      >
        <ChevronLeft size={26} color="#0F1312" />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Spacer to keep the title centered against the back button. */}
      <View style={styles.iconButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
});

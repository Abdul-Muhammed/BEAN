import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { MoreHorizontal } from 'lucide-react-native';
import { SETTINGS_COG_SVG } from '@/constants/profileIcons';
import { colors } from '@/constants/theme';

interface ProfileHeaderProps {
  username: string;
  onPressSettings: () => void;
  onPressOverflow: () => void;
}

/** Sticky top bar: settings cog (left), centered username, overflow menu (right). */
export default function ProfileHeader({
  username,
  onPressSettings,
  onPressOverflow,
}: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onPressSettings}
        hitSlop={10}
        activeOpacity={0.7}
      >
        <SvgXml xml={SETTINGS_COG_SVG} width={22} height={21} />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {username}
      </Text>

      <TouchableOpacity
        style={styles.iconButton}
        onPress={onPressOverflow}
        hitSlop={10}
        activeOpacity={0.7}
      >
        <MoreHorizontal size={24} color="#0F1312" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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

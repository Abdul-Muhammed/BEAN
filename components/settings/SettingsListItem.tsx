import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface SettingsListItemProps {
  /** Left-side icon element (lucide icon, SvgXml, etc.). */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  onPress?: () => void;
  /** Override the chevron with a custom right element, or pass null to hide it. */
  right?: React.ReactNode;
  /** Tint the title (e.g. red for destructive rows). */
  titleColor?: string;
}

/** iOS-style settings row: icon · (title + description) · chevron. */
export default function SettingsListItem({
  icon,
  title,
  description,
  onPress,
  right,
  titleColor = '#1C1C1E',
}: SettingsListItemProps) {
  const showDefaultChevron = right === undefined;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <View style={styles.center}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {showDefaultChevron ? (
        <ChevronRight size={20} color="#C4C4C6" />
      ) : (
        right
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Lato-Bold',
  },
  description: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#777777',
    lineHeight: 18,
  },
});

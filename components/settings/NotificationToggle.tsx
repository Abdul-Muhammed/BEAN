import React from 'react';
import { View, Text, StyleSheet, Switch, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface NotificationToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** Single bell row + native switch: "Allow Notifications". */
export default function NotificationToggle({ value, onValueChange }: NotificationToggleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Bell size={22} color={colors.primary} />
      </View>
      <View style={styles.center}>
        <Text style={styles.title}>Allow Notifications</Text>
        <Text style={styles.subtitle}>
          Get reminders and recommendations from Bean
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E5EA', true: colors.gold }}
        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        ios_backgroundColor="#E5E5EA"
      />
    </View>
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
    color: '#1C1C1E',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#777777',
    lineHeight: 18,
  },
});

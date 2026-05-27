import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  onPress?: () => void;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  iconColor = '#1C1C1E',
  onPress,
}: StatCardProps) {
  const content = (
    <>
      <Icon size={20} color={iconColor} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.82}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Lato-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  value: {
    fontSize: 20,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
});

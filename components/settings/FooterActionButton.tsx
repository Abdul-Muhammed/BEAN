import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/theme';

interface FooterActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

/** One of the three equal-width social/feedback buttons in the About footer. */
export default function FooterActionButton({ icon, label, onPress }: FooterActionButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
});

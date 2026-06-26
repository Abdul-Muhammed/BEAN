import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BeanLogo from '../BeanLogo';
import { colors } from '@/constants/theme';

interface AboutCardProps {
  appName: string;
  version: string;
}

/** Large hero card at the top of the About screen: logo, app name, version. */
export default function AboutCard({ appName, version }: AboutCardProps) {
  return (
    <View style={styles.card}>
      <BeanLogo width={56} height={94} />
      <Text style={styles.name}>{appName}</Text>
      <Text style={styles.version}>Version {version}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingVertical: 28,
    alignItems: 'center',
  },
  name: {
    marginTop: 16,
    fontSize: 24,
    fontFamily: 'OtomanopeeOne-Regular',
    color: '#1C1C1E',
    letterSpacing: 1,
  },
  version: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Lato-Regular',
    color: '#777777',
  },
});

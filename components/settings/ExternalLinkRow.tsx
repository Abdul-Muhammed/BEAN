import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ExternalLink } from 'lucide-react-native';

interface ExternalLinkRowProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
}

/** Row that opens an external URL (About screen). Title + subtitle on the left,
 *  an external-link glyph on the right. */
export default function ExternalLinkRow({ title, subtitle, onPress }: ExternalLinkRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <ExternalLink size={18} color="#C4C4C6" />
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
  },
});

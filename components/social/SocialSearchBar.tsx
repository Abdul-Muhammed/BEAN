import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';

interface SocialSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** Shared search field for the connections screens. Presentational only —
 *  callers own the (debounced) query state. */
export default function SocialSearchBar({
  value,
  onChangeText,
  placeholder = 'Search by name or @username',
}: SocialSearchBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <Search size={18} color="#8E8E93" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Lato-Regular',
    color: '#1C1C1E',
    padding: 0,
  },
});

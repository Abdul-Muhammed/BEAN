import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { StoryCardVariant } from './ReviewStoryCard';

const OPTIONS: { value: StoryCardVariant; label: string }[] = [
  { value: 'filled', label: 'Filled' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'compact', label: 'Compact' },
  { value: 'simple', label: 'Simple' },
];

// Four segments have to fit a 375pt-wide phone with room to spare.
const SEGMENT_WIDTH = 84;
const SEGMENT_HEIGHT = 32;
const INSET = 3;

interface TemplateToggleProps {
  value: StoryCardVariant;
  onChange: (value: StoryCardVariant) => void;
}

/** Pill segmented control that picks the story card template on Share Review. */
export default function TemplateToggle({ value, onChange }: TemplateToggleProps) {
  const selectedIndex = OPTIONS.findIndex((option) => option.value === value);
  const [position] = useState(() => new Animated.Value(selectedIndex));

  useEffect(() => {
    Animated.spring(position, {
      toValue: selectedIndex,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [position, selectedIndex]);

  return (
    <View style={styles.track} accessibilityRole="tablist">
      <Animated.View
        style={[
          styles.indicator,
          {
            // One segment width per step, however many options there are.
            transform: [{ translateX: Animated.multiply(position, SEGMENT_WIDTH) }],
          },
        ]}
      />
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={styles.segment}
            onPress={() => onChange(option.value)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label} template`}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: INSET,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.background,
  },
  indicator: {
    position: 'absolute',
    top: INSET,
    left: INSET,
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  segment: {
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Lato-Bold',
    fontSize: 13,
    color: colors.greyNormal,
  },
  labelSelected: {
    color: colors.white,
  },
});

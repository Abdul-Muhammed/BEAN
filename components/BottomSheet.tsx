import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

// Get screen height dynamically to avoid module-level initialization issues
const getScreenHeight = () => Dimensions.get('window').height;

interface BottomSheetProps {
  children: React.ReactNode;
  snapPositions?: number[]; // Heights in pixels from bottom
  defaultPosition?: number; // Index in snapPositions array
  onPositionChange?: (position: number) => void;
}

export default function BottomSheet({
  children,
  snapPositions,
  defaultPosition = 1,
  onPositionChange,
}: BottomSheetProps) {
  const SCREEN_HEIGHT = getScreenHeight();

  // Store snap positions as constants for worklet access
  const snaps = React.useMemo(
    () => snapPositions || [80, SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 0.9],
    [SCREEN_HEIGHT, snapPositions]
  );

  // translateY represents how much the sheet is pulled up from bottom
  // Higher values = sheet is higher up (more visible)
  const translateY = useSharedValue(SCREEN_HEIGHT - snaps[defaultPosition]);
  const context = useSharedValue({ y: 0 });

  // Store min/max in shared values for worklet access
  const minHeight = useSharedValue(SCREEN_HEIGHT - Math.max(...snaps));
  const maxHeight = useSharedValue(SCREEN_HEIGHT - Math.min(...snaps));

  React.useEffect(() => {
    minHeight.value = SCREEN_HEIGHT - Math.max(...snaps);
    maxHeight.value = SCREEN_HEIGHT - Math.min(...snaps);
  }, [SCREEN_HEIGHT, maxHeight, minHeight, snaps]);

  const clamp = (value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      'worklet';
      // Negative translationY means dragging down (sheet going down)
      const newY = context.value.y - event.translationY;
      translateY.value = clamp(newY, minHeight.value, maxHeight.value);
    })
    .onEnd(() => {
      'worklet';
      const currentY = translateY.value;
      const currentHeight = SCREEN_HEIGHT - currentY;

      // Find nearest snap position (worklet can access snaps from closure if it's a constant)
      let nearest = snaps[0];
      let minDistance = Math.abs(currentHeight - snaps[0]);
      for (let i = 1; i < snaps.length; i++) {
        const distance = Math.abs(currentHeight - snaps[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = snaps[i];
        }
      }

      const nearestSnap = SCREEN_HEIGHT - nearest;
      translateY.value = withSpring(nearestSnap, {
        damping: 20,
        stiffness: 90,
      });

      if (onPositionChange) {
        const heightFromBottom = SCREEN_HEIGHT - nearestSnap;
        const findIndex = () => {
          const positionIndex = snaps.findIndex(
            (pos) => Math.abs(pos - heightFromBottom) < 1
          );
          if (positionIndex >= 0) {
            onPositionChange(positionIndex);
          }
        };
        runOnJS(findIndex)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const screenHeight = getScreenHeight();
  const styles = StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000000',
      zIndex: 1,
    },
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 10,
      zIndex: 2,
      maxHeight: screenHeight * 0.95,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#E5E5EA',
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <>
      {/* Backdrop overlay */}
      <Animated.View
        style={[
          styles.backdrop,
          useAnimatedStyle(() => {
            const heightFromBottom = SCREEN_HEIGHT - translateY.value;
            const maxHeightValue = Math.max(...snaps);
            const opacity = heightFromBottom / maxHeightValue;
            return {
              opacity: Math.max(0, Math.min(1, opacity * 0.5)),
            };
          }),
        ]}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            translateY.value = withSpring(SCREEN_HEIGHT - snaps[0], {
              damping: 20,
              stiffness: 90,
            });
            if (onPositionChange) {
              onPositionChange(0);
            }
          }}
        >
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Bottom Sheet */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.bottomSheet, animatedStyle]}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

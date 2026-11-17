import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, type } from '@/constants/theme';

interface ShareStorySheetProps {
  visible: boolean;
  /** Fires after the sheet has fully closed via Share to Stories, right after onClosed. */
  onShare: () => void;
  /** Fires once the sheet has fully closed, however it was dismissed. */
  onClosed: () => void;
}

// @3x PNG export of the 358x180 "Story Templates Illustration" frame (837:17817)
// in the Bean (Copy) Figma file; the @3x suffix makes RN treat it as 358x180pt.
// Required without the suffix: Metro picks the density variant itself.
const ILLUSTRATION = require('@/assets/images/tutorial/share-story-illustration.png');

const SHEET_SLIDE_MS = 280;
// Same bottom spacing as TutorialSheet: Figma leaves 38pt under the buttons on
// a frame whose home indicator inset is 34pt.
const BOTTOM_EXTRA = 4;

/**
 * One-time prompt shown over Home right after the user logs their first review
 * (Figma "Tutorial / Step 5", 837:15120), nudging them to turn it into an
 * Instagram Story.
 *
 * Not now, a backdrop tap and Android back all close it. Like TutorialSheet,
 * the Modal stays mounted through the exit animation and the callbacks wait for
 * it to be gone, so navigating to the share screen never races the dismissal.
 */
export default function ShareStorySheet({ visible, onShare, onClosed }: ShareStorySheetProps) {
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
  const open = visible && !hidden;
  const [sheetHeight, setSheetHeight] = useState(0);
  const closing = useRef(false);
  const pendingShare = useRef(false);

  const backdrop = useSharedValue(0);
  const slide = useSharedValue(0);

  useEffect(() => {
    if (!open || sheetHeight === 0) return;
    backdrop.set(withTiming(1, { duration: SHEET_SLIDE_MS }));
    slide.set(withTiming(1, { duration: SHEET_SLIDE_MS, easing: Easing.out(Easing.cubic) }));
  }, [open, sheetHeight, backdrop, slide]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - slide.value) * sheetHeight }],
  }));

  // onClosed runs first so the parent can tidy its own route (e.g. clear params)
  // before onShare navigates away from it.
  const finish = () => {
    const share = pendingShare.current;
    pendingShare.current = false;
    onClosed();
    if (share) onShare();
  };

  const handleHidden = () => {
    setHidden(true);
    // iOS reports the dismissal through Modal.onDismiss; Android unmounts
    // synchronously, so it's already gone.
    if (Platform.OS !== 'ios') finish();
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    backdrop.set(withTiming(0, { duration: SHEET_SLIDE_MS }));
    slide.set(
      withTiming(0, { duration: SHEET_SLIDE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(handleHidden)();
      })
    );
  };

  const handleShare = () => {
    pendingShare.current = true;
    close();
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
      onDismiss={finish}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" />
      </Animated.View>
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, sheetStyle, sheetHeight === 0 && styles.unmeasured]}
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.grabber} />

          <Text style={styles.eyebrow}>You logged your first visit!</Text>

          <View style={styles.illustration}>
            <Image source={ILLUSTRATION} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Share it to your Story.</Text>
            <Text style={styles.body}>
              Turn your review into an Instagram Story. Pick a template and post it in one tap.
            </Text>
          </View>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + BOTTOM_EXTRA }]}>
            <TouchableOpacity style={styles.secondaryButton} onPress={close} activeOpacity={0.7}>
              <Text style={styles.secondaryText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleShare} activeOpacity={0.85}>
              <Text style={styles.primaryText}>Share to Stories</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#262626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  unmeasured: {
    opacity: 0,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 100,
    backgroundColor: colors.ink,
  },
  eyebrow: {
    ...type.footnote1,
    width: '100%',
    color: colors.greyNormal,
    textAlign: 'center',
  },
  illustration: {
    width: '100%',
    aspectRatio: 358 / 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.cream,
  },
  copy: {
    width: '100%',
    paddingVertical: 8,
    gap: 8,
  },
  title: {
    fontFamily: fonts.black,
    fontSize: 22,
    color: colors.ink,
  },
  body: {
    ...type.body1,
    color: colors.greyNormal,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
  },
  secondaryButton: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...type.title1,
    color: colors.ink,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...type.title1,
    color: colors.background,
  },
});

import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { colors, fonts, type } from '@/constants/theme';
import { TUTORIAL_EAN_SVG, TUTORIAL_LOGO_SVG } from '@/constants/tutorialIcons';
import { triggerSaveHaptic } from '@/lib/haptics';

interface TutorialSheetProps {
  visible: boolean;
  /** Fires once the sheet has fully closed after Skip or Start Exploring. */
  onClosed: () => void;
}

interface TutorialStep {
  title: string;
  body: string;
  illustration: ImageSourcePropType;
}

// Copy and illustrations from the Bean (Copy) Figma file, frames
// "Tutorial / Step 1-4" (787:13627, 787:15013, 787:15568, 787:16171). The
// illustrations are @3x lossless WebP exports of each 358x150 frame; the @3x
// file suffix is what tells RN they're 358x150pt rather than 1074x450.
const STEPS: TutorialStep[] = [
  {
    title: 'Your coffee life, in one place.',
    body: 'Bean helps you discover cafes, save the ones you love, and remember every cup worth coming back for.',
    illustration: require('@/assets/images/tutorial/overview-illustration.webp'),
  },
  {
    title: 'Find your next favorite cafe.',
    body: 'Browse nearby spots and explore details like atmosphere, Wi-Fi, food, and what the community is saying.',
    illustration: require('@/assets/images/tutorial/discover-illustration.webp'),
  },
  {
    title: 'Keep a simple coffee diary.',
    body: 'After a visit, add your drink, rating, and a quick note. Your personal coffee map grows with every sip.',
    illustration: require('@/assets/images/tutorial/diary-illustration.webp'),
  },
  {
    title: 'Save what matters to you.',
    body: 'Use your diary and saved cafes to create a trusted shortlist for solo mornings, work sessions, or catch-ups.',
    illustration: require('@/assets/images/tutorial/saved-illustration.webp'),
  },
];

const HAND_ICON = require('@/assets/images/tutorial/hand.webp');

const SHEET_SLIDE_MS = 280;
const CONTENT_FADE_MS = 140;
const SEGMENT_MS = 220;
// Figma leaves 38pt under the buttons on a frame whose home indicator inset
// is 34pt.
const BOTTOM_EXTRA = 4;

function ProgressSegment({ active }: { active: boolean }) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.set(
      withTiming(active ? 1 : 0, { duration: SEGMENT_MS, easing: Easing.out(Easing.quad) })
    );
  }, [active, progress]);

  const style = useAnimatedStyle(() => ({
    width: 16 + progress.value * 48,
    backgroundColor: progress.value > 0.5 ? colors.beanFill : colors.accent2,
  }));

  return <Animated.View style={[styles.segment, style]} />;
}

/**
 * One-time walkthrough shown over Home right after onboarding.
 *
 * Buttons only: there's no swipe, drag-to-dismiss or backdrop tap, and Android
 * back is swallowed, so Skip Tutorial and Start Exploring Bean are the only
 * ways out. The Modal stays mounted through the exit animation and onClosed
 * waits for it to be gone, so the location primer (also a Modal) never tries
 * to present on top of a dismissing one.
 */
export default function TutorialSheet({ visible, onClosed }: TutorialSheetProps) {
  const insets = useSafeAreaInsets();
  // Set once the exit animation finishes, so the Modal goes away before the
  // parent hears about it.
  const [hidden, setHidden] = useState(false);
  const open = visible && !hidden;
  const [stepIndex, setStepIndex] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);

  const backdrop = useSharedValue(0);
  const slide = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  // Slide in once the sheet has been measured, so it starts fully off screen.
  useEffect(() => {
    if (!open || sheetHeight === 0) return;
    backdrop.set(withTiming(1, { duration: SHEET_SLIDE_MS }));
    slide.set(
      withTiming(1, { duration: SHEET_SLIDE_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [open, sheetHeight, backdrop, slide]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - slide.value) * sheetHeight }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  const handleHidden = () => {
    setHidden(true);
    // iOS reports the dismissal through Modal.onDismiss; Android unmounts
    // synchronously, so it's already gone.
    if (Platform.OS !== 'ios') onClosed();
  };

  const close = () => {
    backdrop.set(withTiming(0, { duration: SHEET_SLIDE_MS }));
    slide.set(
      withTiming(0, { duration: SHEET_SLIDE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(handleHidden)();
      })
    );
  };

  const showStep = (next: number) => {
    setStepIndex(next);
    contentOpacity.set(withTiming(1, { duration: CONTENT_FADE_MS }));
  };

  const handleNext = () => {
    triggerSaveHaptic();
    const next = stepIndex + 1;
    contentOpacity.set(
      withTiming(0, { duration: CONTENT_FADE_MS }, (finished) => {
        if (finished) runOnJS(showStep)(next);
      })
    );
  };

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
      onDismiss={onClosed}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, sheetStyle, sheetHeight === 0 && styles.unmeasured]}
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={styles.welcome}>Welcome To</Text>
            <View style={styles.wordmark}>
              <SvgXml xml={TUTORIAL_LOGO_SVG} width={11.5117} height={15.999} />
              <SvgXml xml={TUTORIAL_EAN_SVG} width={42.3844} height={15.9999} />
            </View>
          </View>

          <Animated.View style={[styles.stepContent, contentStyle]}>
            <View style={styles.illustration}>
              <Image
                source={step.illustration}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
            </View>
          </Animated.View>

          <View style={styles.progress}>
            {STEPS.map((s, i) => (
              <ProgressSegment key={s.title} active={i === stepIndex} />
            ))}
          </View>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + BOTTOM_EXTRA }]}>
            {isLastStep ? (
              <TouchableOpacity style={styles.primaryButton} onPress={close} activeOpacity={0.85}>
                <Text style={styles.primaryText}>Start Exploring Bean</Text>
                <Image source={HAND_ICON} style={styles.handIcon} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.skipButton} onPress={close} activeOpacity={0.7}>
                  <Text style={styles.skipText}>Skip Tutorial</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.85}>
                  <Text style={styles.primaryText}>Next</Text>
                </TouchableOpacity>
              </>
            )}
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
  header: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  welcome: {
    ...type.footnote1,
    color: colors.greyNormal,
    textAlign: 'center',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.709,
  },
  stepContent: {
    width: '100%',
    gap: 16,
  },
  // The box sets the size; the Image just fills it, so the asset's intrinsic
  // dimensions can't push the layout around.
  illustration: {
    width: '100%',
    aspectRatio: 358 / 150,
    borderRadius: 8,
    overflow: 'hidden',
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
  progress: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    height: 4,
    borderRadius: 8,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 16,
  },
  skipButton: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    ...type.title1,
    color: colors.ink,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    ...type.title1,
    color: colors.background,
  },
  handIcon: {
    width: 15,
    height: 16,
  },
});

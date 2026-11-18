import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link2, Share as ShareIcon } from 'lucide-react-native';

import ShareTargetTile from '../share/ShareTargetTile';
import { useToast } from '../../context/ToastContext';
import { getShareNatives } from '../../lib/shareNative';
import { profileLinkUrl } from '@/constants/links';
import { colors, fonts, type } from '@/constants/theme';

interface ShareProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  /** True on your own profile; only changes the wording. */
  isOwnProfile?: boolean;
}

const SHEET_SLIDE_MS = 240;

type PendingAction = 'copy' | 'more' | null;

/**
 * Bottom sheet behind the profile header's share icon. It offers Copy Link and
 * More (the system share sheet), both carrying the public profile-link URL.
 *
 * As with ShareStorySheet, the chosen action only runs once the sheet has fully
 * closed: the system share sheet can't open over our Modal on iOS, and a toast
 * shown while the Modal is up would be hidden behind it.
 */
export default function ShareProfileSheet({
  visible,
  onClose,
  userId,
  username,
  isOwnProfile = false,
}: ShareProfileSheetProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [sheetHeight, setSheetHeight] = useState(0);
  const [mounted, setMounted] = useState(visible);
  const closing = useRef(false);
  const pending = useRef<PendingAction>(null);

  const backdrop = useSharedValue(0);
  const slide = useSharedValue(0);

  const url = profileLinkUrl(userId);
  const handle = username ? `@${username}` : 'this profile';
  const message = isOwnProfile
    ? `Check out my cafe reviews on Bean (${handle})`
    : `Check out ${handle} on Bean`;

  // Mount as soon as the parent opens the sheet; it stays mounted through the
  // exit animation and unmounts itself once that finishes.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) closing.current = false;
  }, [visible]);

  useEffect(() => {
    if (!mounted || !visible || sheetHeight === 0) return;
    backdrop.set(withTiming(1, { duration: SHEET_SLIDE_MS }));
    slide.set(withTiming(1, { duration: SHEET_SLIDE_MS, easing: Easing.out(Easing.cubic) }));
  }, [mounted, visible, sheetHeight, backdrop, slide]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - slide.value) * sheetHeight }],
  }));

  const runPending = async () => {
    const action = pending.current;
    pending.current = null;
    if (action === 'copy') {
      const natives = getShareNatives();
      if (!natives) {
        showToast({ message: 'Copying is not available on this device' });
        return;
      }
      await natives.Clipboard.setStringAsync(url);
      showToast({ message: 'Link copied', variant: 'success' });
    } else if (action === 'more') {
      try {
        // iOS shows the url as its own attachment; Android only reads message.
        await Share.share(
          Platform.OS === 'ios' ? { message, url } : { message: `${message}\n${url}` }
        );
      } catch {
        // Dismissed — nothing to do.
      }
    }
  };

  const handleHidden = () => {
    setMounted(false);
    onClose();
    // iOS reports the dismissal through Modal.onDismiss, which runs the
    // action; Android unmounts synchronously, so it's already gone.
    if (Platform.OS !== 'ios') runPending();
  };

  const close = (action: PendingAction = null) => {
    if (closing.current) return;
    closing.current = true;
    pending.current = action;
    backdrop.set(withTiming(0, { duration: SHEET_SLIDE_MS }));
    slide.set(
      withTiming(0, { duration: SHEET_SLIDE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(handleHidden)();
      })
    );
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close()}
      onDismiss={runPending}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => close()}
          accessibilityLabel="Dismiss"
        />
      </Animated.View>
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            sheetStyle,
            sheetHeight === 0 && styles.unmeasured,
          ]}
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>Share {isOwnProfile ? 'your profile' : handle}</Text>
          <View style={styles.tileRow}>
            <ShareTargetTile
              icon={<Link2 size={24} color={colors.ink} />}
              label="Copy Link"
              onPress={() => close('copy')}
              fixedWidth
            />
            <ShareTargetTile
              icon={<ShareIcon size={24} color={colors.ink} />}
              label="More"
              onPress={() => close('more')}
              fixedWidth
            />
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
  title: {
    ...type.body1,
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 22,
    width: '100%',
    color: colors.ink,
    textAlign: 'center',
  },
  tileRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

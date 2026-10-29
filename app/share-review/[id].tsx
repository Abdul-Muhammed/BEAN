import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Download, Link2, Share as ShareIcon } from 'lucide-react-native';
import Svg, { Defs, Pattern, Rect, SvgXml } from 'react-native-svg';
import Constants from 'expo-constants';

import ReviewStoryCard, {
  STORY_ASPECT_RATIO,
  STORY_EXPORT_WIDTH,
  StoryCardVariant,
} from '../../components/share/ReviewStoryCard';
import ShareTargetTile from '../../components/share/ShareTargetTile';
import TemplateToggle from '../../components/share/TemplateToggle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BeanLogo from '../../components/BeanLogo';
import { useReviews } from '../../context/ReviewContext';
import { useToast } from '../../context/ToastContext';
import { getReviewById } from '../../lib/follows';
// Resolved lazily: importing these packages directly would crash the whole app
// at route-tree build time on a binary that predates them. See lib/shareNative.
import { getMissingShareModules, getShareNatives } from '../../lib/shareNative';
import { reviewLinkUrl } from '@/constants/links';
import { INSTAGRAM_STORY_SVG } from '@/constants/shareIcons';
import { colors } from '@/constants/theme';
import { UserReview } from '../../data/mockData';

const PREVIEW_WIDTH = 229.5;
const PREVIEW_HEIGHT = PREVIEW_WIDTH / STORY_ASPECT_RATIO;
const EXPORT_HEIGHT = STORY_EXPORT_WIDTH / STORY_ASPECT_RATIO;

const VARIANTS: StoryCardVariant[] = ['filled', 'transparent', 'compact', 'simple'];
/** The template the user picked last, so the screen reopens on it. */
const SHARE_TEMPLATE_KEY = 'bean:shareTemplate';

function isVariant(value: string | null): value is StoryCardVariant {
  return VARIANTS.includes(value as StoryCardVariant);
}

/** Instagram only accepts a story share from a registered Facebook app id. */
const FACEBOOK_APP_ID =
  (Constants.expoConfig?.extra as { facebookAppId?: string } | undefined)?.facebookAppId ?? '';

/**
 * The alpha checkerboard behind the preview. It exists only to show the user
 * that the exported PNG is transparent — it is never part of the capture, which
 * reads from the off-screen copy at the bottom of this file.
 */
function AlphaCheckerboard({ width, height }: { width: number; height: number }) {
  const square = 14;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="alpha" width={square * 2} height={square * 2} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={square * 2} height={square * 2} fill="#3D3D3D" />
          <Rect x={0} y={0} width={square} height={square} fill="#4A4A4A" />
          <Rect x={square} y={square} width={square} height={square} fill="#4A4A4A" />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#alpha)" />
    </Svg>
  );
}

export default function ShareReviewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userReviews } = useReviews();
  const { showToast } = useToast();

  const reviewId = Array.isArray(id) ? id[0] : id;

  const localReview = useMemo(
    () => userReviews.find((entry) => entry.id === reviewId),
    [reviewId, userReviews]
  );
  const [fetchedReview, setFetchedReview] = useState<UserReview | null>(null);
  const review = localReview ?? fetchedReview;

  // A review reached through a shared link isn't in the local cache.
  useEffect(() => {
    if (localReview || !reviewId) return;
    let cancelled = false;
    getReviewById(reviewId)
      .then((result) => {
        if (!cancelled && result) setFetchedReview(result.review);
      })
      .catch(() => {
        /* Falls through to the not-found state below. */
      });
    return () => {
      cancelled = true;
    };
  }, [localReview, reviewId]);

  const [variant, setVariant] = useState<StoryCardVariant>('filled');
  // The template the screen opened on, once the remembered choice has been read.
  // Captures wait for it so that template's image is ready first.
  const [initialVariant, setInitialVariant] = useState<StoryCardVariant | null>(null);

  // One opacity per template; the previews are stacked and cross-fade.
  const [fades] = useState(() => ({
    filled: new Animated.Value(1),
    transparent: new Animated.Value(0),
    compact: new Animated.Value(0),
    simple: new Animated.Value(0),
  }));

  useEffect(() => {
    AsyncStorage.getItem(SHARE_TEMPLATE_KEY)
      .catch(() => null)
      .then((stored) => {
        const start = isVariant(stored) ? stored : 'filled';
        // Jump straight to the remembered template rather than fading to it.
        VARIANTS.forEach((v) => fades[v].setValue(v === start ? 1 : 0));
        setVariant(start);
        setInitialVariant(start);
      });
  }, [fades]);

  useEffect(() => {
    Animated.parallel(
      VARIANTS.map((v) =>
        Animated.timing(fades[v], {
          toValue: v === variant ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [fades, variant]);

  const handleVariantChange = useCallback((next: StoryCardVariant) => {
    setVariant(next);
    AsyncStorage.setItem(SHARE_TEMPLATE_KEY, next).catch(() => {});
  }, []);

  const filledExportRef = useRef<ViewInstance>(null);
  const transparentExportRef = useRef<ViewInstance>(null);
  const compactExportRef = useRef<ViewInstance>(null);
  const simpleExportRef = useRef<ViewInstance>(null);
  const exportRefs = useMemo(
    () => ({
      filled: filledExportRef,
      transparent: transparentExportRef,
      compact: compactExportRef,
      simple: simpleExportRef,
    }),
    []
  );
  const [assets, setAssets] = useState<
    Partial<Record<StoryCardVariant, { fileUri: string; base64: string }>>
  >({});
  const current = assets[variant];

  // Resolved once per mount. Null on a dev client built before these packages
  // were added, which is the common case right after pulling this branch.
  const natives = useMemo(() => getShareNatives(), []);
  const missingModules = useMemo(() => getMissingShareModules(), []);

  // Rasterise every off-screen 1080x1920 template once, so switching between
  // them never waits on a capture. The tmpfile feeds the OS share sheet and the
  // photo library; the base64 copy feeds Instagram's sticker payload and the
  // clipboard.
  useEffect(() => {
    if (!review || !natives || !initialVariant) return;
    let cancelled = false;
    // A beat of grace so the off-screen cards have laid out before capture.
    const timer = setTimeout(async () => {
      const targets = [initialVariant, ...VARIANTS.filter((v) => v !== initialVariant)];
      try {
        // Sequential, not Promise.all: each pair of calls reads the same native
        // view, and running them concurrently can interleave the snapshot. The
        // template the screen opened on goes first so its tiles unlock soonest.
        for (const target of targets) {
          const ref = exportRefs[target];
          const fileUri = await natives.captureRef(ref, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
          const dataUri = await natives.captureRef(ref, {
            format: 'png',
            quality: 1,
            result: 'data-uri',
          });
          if (cancelled) return;
          const base64 = dataUri.replace(/^data:image\/png;base64,/, '');
          setAssets((prev) => ({ ...prev, [target]: { fileUri, base64 } }));
        }
      } catch {
        if (!cancelled) showToast({ message: 'Could not build the share image' });
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [review, natives, initialVariant, exportRefs, showToast]);

  const shareUrl = reviewId ? reviewLinkUrl(reviewId) : '';

  const handleInstagram = useCallback(async () => {
    if (!current || !natives) return;
    if (!FACEBOOK_APP_ID) {
      showToast({ message: 'Instagram sharing is not configured yet' });
      return;
    }
    try {
      await natives.RNShare.shareSingle({
        social: natives.Social.InstagramStories,
        appId: FACEBOOK_APP_ID,
        stickerImage: `data:image/png;base64,${current.base64}`,
        backgroundBottomColor: colors.ink,
        backgroundTopColor: colors.ink,
        attributionURL: shareUrl,
      });
    } catch {
      showToast({ message: 'Could not open Instagram' });
    }
  }, [current, natives, shareUrl, showToast]);

  const handleCopyImage = useCallback(async () => {
    if (!current || !natives) return;
    // expo-clipboard can only put an image on the pasteboard on iOS. Android
    // gets the link instead so the tile still does something useful.
    if (Platform.OS !== 'ios') {
      await natives.Clipboard.setStringAsync(shareUrl);
      showToast({ message: 'Link copied' });
      return;
    }
    try {
      await natives.Clipboard.setImageAsync(current.base64);
      showToast({ message: 'Image copied' });
    } catch {
      showToast({ message: 'Could not copy the image' });
    }
  }, [current, natives, shareUrl, showToast]);

  const handleSave = useCallback(async () => {
    if (!current || !natives) return;
    try {
      const { granted } = await natives.MediaLibrary.requestPermissionsAsync();
      if (!granted) {
        showToast({ message: 'Photo permission is needed to save' });
        return;
      }
      await natives.MediaLibrary.saveToLibraryAsync(current.fileUri);
      showToast({ message: 'Saved to your photos', variant: 'success' });
    } catch {
      showToast({ message: 'Could not save the image' });
    }
  }, [current, natives, showToast]);

  const handleCopyLink = useCallback(async () => {
    if (!natives) return;
    await natives.Clipboard.setStringAsync(shareUrl);
    showToast({ message: 'Link copied' });
  }, [natives, shareUrl, showToast]);

  const handleMore = useCallback(async () => {
    if (!current || !natives) return;
    if (!(await natives.Sharing.isAvailableAsync())) {
      showToast({ message: 'Sharing is not available on this device' });
      return;
    }
    await natives.Sharing.shareAsync(current.fileUri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Share review',
    });
  }, [current, natives, showToast]);

  if (!review) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <BeanLogo width={58} height={98} />
        <Text style={styles.emptyTitle}>Review not found</Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
          <Text style={styles.backHomeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const unavailable = missingModules.length > 0;
  // Only "busy" until the selected template's image is ready; when the native
  // modules are absent there is nothing to wait for, so show the tiles (inert)
  // instead of a spinner that would never resolve.
  const busy = !unavailable && !current;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarButton}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Share Review</Text>
        <View style={styles.topBarButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.previewSection}>
          <View style={styles.previewFrame}>
            <AlphaCheckerboard width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} />
            {VARIANTS.map((v) => (
              <Animated.View key={v} style={[styles.previewLayer, { opacity: fades[v] }]}>
                <ReviewStoryCard review={review} width={PREVIEW_WIDTH} variant={v} />
              </Animated.View>
            ))}
          </View>
          <TemplateToggle value={variant} onChange={handleVariantChange} />
        </View>

        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>Share To</Text>

          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.ink} />
              <Text style={styles.busyText}>Preparing your image...</Text>
            </View>
          ) : (
            <View>
              {unavailable && (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>
                    Rebuild the dev client to enable sharing — missing{' '}
                    {missingModules.join(', ')}.
                  </Text>
                </View>
              )}

              <View style={styles.primaryRow}>
                <ShareTargetTile
                  icon={<SvgXml xml={INSTAGRAM_STORY_SVG} width={48} height={48} />}
                  label={'Instagram\nStory'}
                  onPress={handleInstagram}
                  disabled={unavailable}
                  plainIcon
                />
              </View>

              <View style={styles.tileRow}>
                <ShareTargetTile
                  icon={<Copy size={18} color={colors.ink} />}
                  label="Copy To Clipboard"
                  onPress={handleCopyImage}
                  disabled={unavailable}
                  fixedWidth
                />
                <ShareTargetTile
                  icon={<Download size={18} color={colors.ink} />}
                  label="Save"
                  onPress={handleSave}
                  disabled={unavailable}
                  fixedWidth
                />
                <ShareTargetTile
                  icon={<Link2 size={24} color={colors.ink} />}
                  label="Copy Link"
                  onPress={handleCopyLink}
                  disabled={unavailable}
                  fixedWidth
                />
                <ShareTargetTile
                  icon={<ShareIcon size={24} color={colors.ink} />}
                  label="More"
                  onPress={handleMore}
                  disabled={unavailable}
                  fixedWidth
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Off-screen full-resolution copies, one per template — these are what
          actually get exported. */}
      <View style={styles.offscreen} pointerEvents="none">
        {VARIANTS.map((v) => (
          <View key={v} ref={exportRefs[v]} collapsable={false} style={styles.exportFrame}>
            <ReviewStoryCard review={review} width={STORY_EXPORT_WIDTH} variant={v} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  emptyTitle: {
    marginTop: 24,
    fontSize: 22,
    fontFamily: 'OtomanopeeOne-Regular',
    color: colors.primary,
    textAlign: 'center',
  },
  backHomeButton: {
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  backHomeButtonText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.white,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 15,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: colors.background,
  },
  topBarButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontFamily: 'Lato-Black',
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  previewSection: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    backgroundColor: colors.cream,
  },
  previewFrame: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    overflow: 'hidden',
  },
  previewLayer: {
    ...StyleSheet.absoluteFill,
  },
  shareSection: {
    gap: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  sectionTitle: {
    fontFamily: 'Lato-Black',
    fontSize: 14,
    color: colors.ink,
  },
  notice: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.greyExtraLight,
  },
  noticeText: {
    fontFamily: 'Lato-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.greyNormal,
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  tileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  busy: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  busyText: {
    fontFamily: 'Lato-Regular',
    fontSize: 14,
    color: colors.greyNormal,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 0,
  },
  exportFrame: {
    width: STORY_EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    backgroundColor: 'transparent',
  },
});

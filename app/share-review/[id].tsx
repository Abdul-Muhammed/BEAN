import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Download, Link2, Share as ShareIcon } from 'lucide-react-native';
import Svg, { Defs, Pattern, Rect, SvgXml } from 'react-native-svg';
import Constants from 'expo-constants';

import ReviewStoryCard, {
  STORY_ASPECT_RATIO,
  STORY_EXPORT_WIDTH,
} from '../../components/share/ReviewStoryCard';
import ShareTargetTile from '../../components/share/ShareTargetTile';
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

  const exportRef = useRef<View>(null);
  const [assets, setAssets] = useState<{ fileUri: string; base64: string } | null>(null);

  // Resolved once per mount. Null on a dev client built before these packages
  // were added, which is the common case right after pulling this branch.
  const natives = useMemo(() => getShareNatives(), []);
  const missingModules = useMemo(() => getMissingShareModules(), []);

  // Nothing to wait for when the capture can't run at all.
  const [capturing, setCapturing] = useState(() => !!natives);

  // Rasterise the off-screen 1080x1920 card once and reuse it for every target.
  // The tmpfile feeds the OS share sheet and the photo library; the base64 copy
  // feeds Instagram's sticker payload and the clipboard.
  useEffect(() => {
    if (!review || !natives) return;
    let cancelled = false;
    // A beat of grace so the off-screen card has laid out before capture.
    const timer = setTimeout(async () => {
      try {
        // Sequential, not Promise.all: both calls read the same native view,
        // and running them concurrently can interleave the snapshot.
        const fileUri = await natives.captureRef(exportRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });
        const dataUri = await natives.captureRef(exportRef, {
          format: 'png',
          quality: 1,
          result: 'data-uri',
        });
        if (!cancelled) {
          setAssets({ fileUri, base64: dataUri.replace(/^data:image\/png;base64,/, '') });
        }
      } catch {
        if (!cancelled) showToast({ message: 'Could not build the share image' });
      } finally {
        if (!cancelled) setCapturing(false);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [review, natives, showToast]);

  const shareUrl = reviewId ? reviewLinkUrl(reviewId) : '';

  const handleInstagram = useCallback(async () => {
    if (!assets || !natives) return;
    if (!FACEBOOK_APP_ID) {
      showToast({ message: 'Instagram sharing is not configured yet' });
      return;
    }
    try {
      await natives.RNShare.shareSingle({
        social: natives.Social.InstagramStories,
        appId: FACEBOOK_APP_ID,
        stickerImage: `data:image/png;base64,${assets.base64}`,
        backgroundBottomColor: colors.ink,
        backgroundTopColor: colors.ink,
        attributionURL: shareUrl,
      });
    } catch {
      showToast({ message: 'Could not open Instagram' });
    }
  }, [assets, natives, shareUrl, showToast]);

  const handleCopyImage = useCallback(async () => {
    if (!assets || !natives) return;
    // expo-clipboard can only put an image on the pasteboard on iOS. Android
    // gets the link instead so the tile still does something useful.
    if (Platform.OS !== 'ios') {
      await natives.Clipboard.setStringAsync(shareUrl);
      showToast({ message: 'Link copied' });
      return;
    }
    try {
      await natives.Clipboard.setImageAsync(assets.base64);
      showToast({ message: 'Image copied' });
    } catch {
      showToast({ message: 'Could not copy the image' });
    }
  }, [assets, natives, shareUrl, showToast]);

  const handleSave = useCallback(async () => {
    if (!assets || !natives) return;
    try {
      const { granted } = await natives.MediaLibrary.requestPermissionsAsync();
      if (!granted) {
        showToast({ message: 'Photo permission is needed to save' });
        return;
      }
      await natives.MediaLibrary.saveToLibraryAsync(assets.fileUri);
      showToast({ message: 'Saved to your photos', variant: 'success' });
    } catch {
      showToast({ message: 'Could not save the image' });
    }
  }, [assets, natives, showToast]);

  const handleCopyLink = useCallback(async () => {
    if (!natives) return;
    await natives.Clipboard.setStringAsync(shareUrl);
    showToast({ message: 'Link copied' });
  }, [natives, shareUrl, showToast]);

  const handleMore = useCallback(async () => {
    if (!assets || !natives) return;
    if (!(await natives.Sharing.isAvailableAsync())) {
      showToast({ message: 'Sharing is not available on this device' });
      return;
    }
    await natives.Sharing.shareAsync(assets.fileUri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Share review',
    });
  }, [assets, natives, showToast]);

  if (!review) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <BeanLogo width={58} height={98} />
        <Text style={styles.emptyTitle}>Review not found</Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
          <Text style={styles.backHomeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const unavailable = missingModules.length > 0;
  // Only "busy" while a capture is genuinely in flight; when the native modules
  // are absent there is nothing to wait for, so show the tiles (inert) instead
  // of a spinner that would never resolve.
  const busy = !unavailable && (capturing || !assets);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

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
            <ReviewStoryCard review={review} width={PREVIEW_WIDTH} />
            <View style={styles.variantChip}>
              <Text style={styles.variantChipText}>Transparent</Text>
            </View>
          </View>
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

      {/* Off-screen full-resolution copy — this is what actually gets exported. */}
      <View style={styles.offscreen} pointerEvents="none">
        <View
          ref={exportRef}
          collapsable={false}
          style={{
            width: STORY_EXPORT_WIDTH,
            height: EXPORT_HEIGHT,
            backgroundColor: 'transparent',
          }}
        >
          <ReviewStoryCard review={review} width={STORY_EXPORT_WIDTH} />
        </View>
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
    paddingVertical: 16,
    backgroundColor: colors.cream,
  },
  previewFrame: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    overflow: 'hidden',
  },
  variantChip: {
    position: 'absolute',
    top: 5.31,
    left: 5.31,
    padding: 4.25,
    borderRadius: 4.25,
    borderWidth: 0.637,
    borderColor: colors.background,
  },
  variantChipText: {
    fontFamily: 'Lato-Bold',
    fontSize: 9.978,
    lineHeight: 11,
    color: '#FFFFFF',
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
});

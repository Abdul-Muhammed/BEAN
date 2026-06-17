import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { X } from 'lucide-react-native';

// Light bean glyph (assets/images/map_icons/light_full_bean.svg) inlined as an
// xml string — same pattern as constants/mapMarkerIcons.ts. The beige #FFCDAB
// fill reads against the dark-brown toast background.
const LIGHT_BEAN_SVG = `<svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.45996 0.333008C5.09818 -0.0194734 5.72351 0.1067 6.19727 0.506836C6.67589 0.911232 6.99902 1.59734 6.99902 2.35059V15.6494C6.99902 16.4027 6.67588 17.0888 6.19727 17.4932C5.72351 17.8933 5.09818 18.0195 4.45996 17.667C3.61295 17.1992 2.84062 16.512 2.18848 15.6426C1.53631 14.773 1.01729 13.7387 0.663086 12.5986C0.308891 11.4585 0.126953 10.2354 0.126953 9C0.126953 7.76462 0.308891 6.5415 0.663086 5.40137C1.01729 4.26127 1.53631 3.22698 2.18848 2.35742C2.84062 1.48797 3.61295 0.800808 4.45996 0.333008Z" fill="#FFCDAB" stroke="#8D3F01" stroke-width="0.253414"/>
<path d="M10.2988 0.333008C9.6606 -0.0194734 9.03528 0.1067 8.56152 0.506836C8.0829 0.911232 7.75977 1.59734 7.75977 2.35059V15.6494C7.75977 16.4027 8.0829 17.0888 8.56152 17.4932C9.03527 17.8933 9.6606 18.0195 10.2988 17.667C11.1458 17.1992 11.9182 16.512 12.5703 15.6426C13.2225 14.773 13.7415 13.7387 14.0957 12.5986C14.4499 11.4585 14.6318 10.2354 14.6318 9C14.6318 7.76462 14.4499 6.5415 14.0957 5.40137C13.7415 4.26127 13.2225 3.22698 12.5703 2.35742C11.9182 1.48797 11.1458 0.800808 10.2988 0.333008Z" fill="#FFCDAB" stroke="#8D3F01" stroke-width="0.253414"/>
</svg>`;

// Height of the bottom tab bar (see app/(tabs)/_layout.tsx). The toast floats
// just above it so it reads as "above the navbar".
const TAB_BAR_HEIGHT = 80;
const AUTO_HIDE_MS = 6000;
const HIDDEN_OFFSET = 40;

// Warm earthy palette per the toast spec.
const TOAST_BG = '#612B05';
const TOAST_BORDER = '#FFCDAB';
const TOAST_TEXT = '#FFCDAB';

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useSharedValue(HIDDEN_OFFSET);
  const opacity = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // Called once the slide-out animation finishes so we can unmount the toast.
  const unmount = useCallback(() => {
    setToast(null);
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(HIDDEN_OFFSET, { duration: 200 }, (finished) => {
      if (finished) runOnJS(unmount)();
    });
  }, [clearTimer, opacity, translateY, unmount]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      clearTimer();
      setToast(options);
      // Reset to the hidden position, then animate up + fade in.
      translateY.value = HIDDEN_OFFSET;
      opacity.value = 0;
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 280 });
      hideTimer.current = setTimeout(hideToast, AUTO_HIDE_MS);
    },
    [clearTimer, hideToast, opacity, translateY]
  );

  useEffect(() => clearTimer, [clearTimer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleAction = useCallback(() => {
    const action = toast?.onAction;
    hideToast();
    action?.();
  }, [hideToast, toast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            { bottom: TAB_BAR_HEIGHT + insets.bottom + 8 },
            animatedStyle,
          ]}
        >
          <View style={styles.toast}>
            <View style={styles.left}>
              <SvgXml xml={LIGHT_BEAN_SVG} width={16} height={19} />
              <Text style={styles.message} numberOfLines={1}>
                {toast.message}
              </Text>
            </View>
            <View style={styles.right}>
              {toast.actionLabel ? (
                <TouchableOpacity onPress={handleAction} hitSlop={8}>
                  <Text style={styles.action}>{toast.actionLabel}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={hideToast} hitSlop={8}>
                <X size={18} color={TOAST_TEXT} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 6,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: TOAST_BG,
    borderWidth: 1,
    borderColor: TOAST_BORDER,
    borderRadius: 8,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  message: {
    fontFamily: 'Lato-Regular',
    fontSize: 14,
    color: TOAST_TEXT,
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  action: {
    fontFamily: 'Lato-Bold',
    fontSize: 16,
    color: TOAST_TEXT,
  },
});

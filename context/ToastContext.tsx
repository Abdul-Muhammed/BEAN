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

// assets/images/snackbar_icons/heart.svg — used by the "favorited" toast.
const HEART_SVG = `<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 4.15428C8 -0.540161 1 -0.0401611 1 5.95987C1 11.9599 10 16.9601 10 16.9601C10 16.9601 19 11.9599 19 5.95987C19 -0.0401611 12 -0.540161 10 4.15428Z" fill="#D1495B" stroke="#D1495B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// assets/images/snackbar_icons/saved.svg — used by the "saved" toast.
const SAVED_SVG = `<svg width="14" height="19" viewBox="0 0 14 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 4.2002V13.6854C1 15.0464 1 15.7268 1.20412 16.1433C1.58245 16.9151 2.41157 17.3588 3.26367 17.2454C3.7234 17.1842 4.28964 16.8067 5.4221 16.0518L5.42481 16.0499C5.87368 15.7507 6.09815 15.6011 6.33295 15.5181C6.76421 15.3656 7.23476 15.3656 7.66602 15.5181C7.90129 15.6012 8.12664 15.7515 8.57732 16.0519C9.70978 16.8069 10.2767 17.1841 10.7364 17.2452C11.5885 17.3586 12.4176 16.9151 12.7959 16.1433C13 15.7269 13 15.0462 13 13.6854V4.19691C13 3.07899 13 2.5192 12.7822 2.0918C12.5905 1.71547 12.2837 1.40973 11.9074 1.21799C11.4796 1 10.9203 1 9.8002 1H4.2002C3.08009 1 2.51962 1 2.0918 1.21799C1.71547 1.40973 1.40973 1.71547 1.21799 2.0918C1 2.51962 1 3.08009 1 4.2002Z" fill="#ADAFA4" stroke="#0F1312" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Height of the bottom tab bar (see app/(tabs)/_layout.tsx). The toast floats
// just above it so it reads as "above the navbar".
const TAB_BAR_HEIGHT = 80;
const AUTO_HIDE_MS = 6000;
const HIDDEN_OFFSET = 40;

export type ToastVariant = 'diary' | 'favorite' | 'saved';

interface VariantStyle {
  bg: string;
  border: string;
  text: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
}

// Per-variant palette + glyph. 'diary' keeps the original warm earthy look; the
// favorite/saved variants follow the snackbar spec colors.
const VARIANT_STYLES: Record<ToastVariant, VariantStyle> = {
  diary: {
    bg: '#612B05',
    border: '#FFCDAB',
    text: '#FFCDAB',
    icon: LIGHT_BEAN_SVG,
    iconWidth: 16,
    iconHeight: 19,
  },
  favorite: {
    bg: '#FFBFC8',
    border: '#D1495B',
    text: '#D1495B',
    icon: HEART_SVG,
    iconWidth: 20,
    iconHeight: 18,
  },
  saved: {
    bg: '#F9F3ED',
    border: '#ADAFA4',
    text: '#0F1312',
    icon: SAVED_SVG,
    iconWidth: 15,
    iconHeight: 20,
  },
};

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: ToastVariant;
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
      {toast && (() => {
        const variant = VARIANT_STYLES[toast.variant ?? 'diary'];
        return (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.wrapper,
              { bottom: TAB_BAR_HEIGHT + insets.bottom + 8 },
              animatedStyle,
            ]}
          >
            <View
              style={[
                styles.toast,
                { backgroundColor: variant.bg, borderColor: variant.border },
              ]}
            >
              <View style={styles.left}>
                <SvgXml
                  xml={variant.icon}
                  width={variant.iconWidth}
                  height={variant.iconHeight}
                />
                <Text style={[styles.message, { color: variant.text }]} numberOfLines={1}>
                  {toast.message}
                </Text>
              </View>
              <View style={styles.right}>
                {toast.actionLabel ? (
                  <TouchableOpacity onPress={handleAction} hitSlop={8}>
                    <Text style={[styles.action, { color: variant.text }]}>
                      {toast.actionLabel}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={hideToast} hitSlop={8}>
                  <X size={18} color={variant.text} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        );
      })()}
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
    borderWidth: 1,
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
  },
});

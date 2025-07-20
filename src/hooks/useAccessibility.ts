import { useState, useEffect, useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
  prefersCrossFadeTransitions: boolean;
}

export interface UseAccessibilityReturn extends AccessibilityState {
  announce: (message: string, priority?: 'low' | 'medium' | 'high') => Promise<void>;
  getFontWeight: (weight: string) => string;
  getAccessibleColor: (color: string, fallback?: string) => string;
  needsHighContrast: () => boolean;
  setFocus: (ref: React.RefObject<any>) => Promise<void>;
  getAnimationDuration: (duration: number) => number;
  getOpacity: (opacity: number) => number;
}

export const useAccessibility = (): UseAccessibilityReturn => {
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
    prefersCrossFadeTransitions: false,
  });

  useEffect(() => {
    const updateAccessibilityState = async () => {
      try {
        const [
          screenReaderEnabled,
          reduceMotionEnabled,
          reduceTransparencyEnabled,
          boldTextEnabled,
          grayscaleEnabled,
          invertColorsEnabled,
        ] = await Promise.all([
          AccessibilityInfo.isScreenReaderEnabled(),
          Platform.OS === 'ios' ? AccessibilityInfo.isReduceMotionEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isGrayscaleEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isInvertColorsEnabled() : Promise.resolve(false),
        ]);

        setAccessibilityState({
          isScreenReaderEnabled: screenReaderEnabled,
          isReduceMotionEnabled: reduceMotionEnabled,
          isReduceTransparencyEnabled: reduceTransparencyEnabled,
          isBoldTextEnabled: boldTextEnabled,
          isGrayscaleEnabled: grayscaleEnabled,
          isInvertColorsEnabled: invertColorsEnabled,
          prefersCrossFadeTransitions: reduceMotionEnabled,
        });
      } catch (error) {
        console.warn('Failed to get accessibility info:', error);
      }
    };

    updateAccessibilityState();

    // Listen for accessibility changes
    const listeners = [
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
        setAccessibilityState(prev => ({ ...prev, isScreenReaderEnabled: enabled }));
      }),
    ];

    if (Platform.OS === 'ios') {
      listeners.push(
        AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
          setAccessibilityState(prev => ({ 
            ...prev, 
            isReduceMotionEnabled: enabled,
            prefersCrossFadeTransitions: enabled 
          }));
        }),
        AccessibilityInfo.addEventListener('reduceTransparencyChanged', (enabled) => {
          setAccessibilityState(prev => ({ ...prev, isReduceTransparencyEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener('boldTextChanged', (enabled) => {
          setAccessibilityState(prev => ({ ...prev, isBoldTextEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener('grayscaleChanged', (enabled) => {
          setAccessibilityState(prev => ({ ...prev, isGrayscaleEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener('invertColorsChanged', (enabled) => {
          setAccessibilityState(prev => ({ ...prev, isInvertColorsEnabled: enabled }));
        })
      );
    }

    return () => {
      listeners.forEach(listener => listener?.remove?.());
    };
  }, []);

  const announce = useCallback(async (
    message: string, 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> => {
    try {
      if (accessibilityState.isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility(message);
      }
    } catch (error) {
      console.warn('Failed to announce message:', error);
    }
  }, [accessibilityState.isScreenReaderEnabled]);

  const getFontWeight = useCallback((weight: string): string => {
    if (accessibilityState.isBoldTextEnabled) {
      // Map weights to bolder variants
      const weightMap: Record<string, string> = {
        '100': '400',
        '200': '400',
        '300': '500',
        '400': '600',
        '500': '700',
        '600': '800',
        '700': '900',
        '800': '900',
        '900': '900',
        'normal': '600',
        'bold': '900',
      };
      return weightMap[weight] || weight;
    }
    return weight;
  }, [accessibilityState.isBoldTextEnabled]);

  const getAccessibleColor = useCallback((
    color: string, 
    fallback?: string
  ): string => {
    // For now, return the original color
    // In a full implementation, you'd calculate contrast ratios
    return needsHighContrast() ? (fallback || color) : color;
  }, []);

  const needsHighContrast = useCallback((): boolean => {
    return accessibilityState.isInvertColorsEnabled || 
           accessibilityState.isGrayscaleEnabled;
  }, [accessibilityState.isInvertColorsEnabled, accessibilityState.isGrayscaleEnabled]);

  const setFocus = useCallback(async (ref: React.RefObject<any>): Promise<void> => {
    try {
      if (ref.current?.focus) {
        ref.current.focus();
      } else if (ref.current?.setNativeProps) {
        AccessibilityInfo.setAccessibilityFocus(ref.current);
      }
    } catch (error) {
      console.warn('Failed to set focus:', error);
    }
  }, []);

  const getAnimationDuration = useCallback((duration: number): number => {
    return accessibilityState.isReduceMotionEnabled ? 0 : duration;
  }, [accessibilityState.isReduceMotionEnabled]);

  const getOpacity = useCallback((opacity: number): number => {
    if (accessibilityState.isReduceTransparencyEnabled) {
      // Increase opacity for better visibility
      return Math.min(1, opacity + 0.2);
    }
    return opacity;
  }, [accessibilityState.isReduceTransparencyEnabled]);

  return {
    ...accessibilityState,
    announce,
    getFontWeight,
    getAccessibleColor,
    needsHighContrast,
    setFocus,
    getAnimationDuration,
    getOpacity,
  };
};

export default useAccessibility;
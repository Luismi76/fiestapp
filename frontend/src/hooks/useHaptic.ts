'use client';

import { useCallback, useMemo } from 'react';

type HapticPattern = 'light' | 'medium' | 'success' | 'error' | 'warning';

const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  success: [10, 50, 10],
  error: [50, 100, 50],
  warning: [30, 50, 30],
};

export function useHaptic() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: HapticPattern = 'light') => {
    if (!isSupported) return false;

    try {
      return navigator.vibrate(HAPTIC_PATTERNS[pattern]);
    } catch {
      return false;
    }
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    navigator.vibrate(0);
  }, [isSupported]);

  return useMemo(() => ({
    vibrate,
    cancel,
    isSupported,
  }), [vibrate, cancel, isSupported]);
}

export default useHaptic;

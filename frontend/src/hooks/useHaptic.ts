'use client';

type HapticPattern = 'light' | 'medium' | 'success' | 'error' | 'warning';

const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  success: [10, 50, 10],
  error: [50, 100, 50],
  warning: [30, 50, 30],
};

/**
 * Hook for providing haptic feedback on user interactions.
 * Uses the Vibration API when available.
 *
 * Usage:
 * ```tsx
 * const { vibrate } = useHaptic();
 *
 * // On button click
 * onClick={() => {
 *   vibrate('success');
 *   // ... rest of handler
 * }}
 * ```
 *
 * Patterns:
 * - `light`: Quick tap feedback (10ms)
 * - `medium`: Standard feedback (20ms)
 * - `success`: Positive action completed (10-50-10ms)
 * - `error`: Error or failure (50-100-50ms)
 * - `warning`: Attention needed (30-50-30ms)
 */
export function useHaptic() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = (pattern: HapticPattern = 'light') => {
    if (!isSupported) return false;

    try {
      return navigator.vibrate(HAPTIC_PATTERNS[pattern]);
    } catch {
      return false;
    }
  };

  const cancel = () => {
    if (!isSupported) return;
    navigator.vibrate(0);
  };

  return {
    vibrate,
    cancel,
    isSupported,
  };
}

export default useHaptic;

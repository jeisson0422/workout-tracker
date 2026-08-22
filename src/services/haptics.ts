type HapticPattern = 'light' | 'medium' | 'success' | 'warning'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 18,
  success: [12, 40, 12],
  warning: [20, 60, 20, 60, 20]
}

export function haptic(pattern: HapticPattern = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(PATTERNS[pattern])
  }
}

import { Haptics, ImpactStyle } from '@capacitor/haptics'

export type HapticImpactStyle = 'light' | 'heavy'

export async function impactNative(style: HapticImpactStyle): Promise<void> {
  try {
    await Haptics.impact({
      style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Heavy,
    })
  } catch {
    // Native haptics unavailable — safe no-op.
  }
}

export function vibrateWeb(durationMs: number): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return false
    }
    return navigator.vibrate(durationMs)
  } catch {
    return false
  }
}

export const SECRET_TAP_COUNT = 7
export const SECRET_TAP_WINDOW_MS = 3_000

export interface SecretTap {
  /** Returns true on the tap that completes the sequence. */
  tap: (now?: number) => boolean
}

/*
 * A standalone PWA and the Capacitor builds have no address bar, so /x cannot be typed there.
 * This is the way in: a deliberate burst of taps nobody hits by accident.
 */
export function createSecretTap(
  count: number = SECRET_TAP_COUNT,
  windowMs: number = SECRET_TAP_WINDOW_MS,
): SecretTap {
  let taps: number[] = []

  return {
    tap(now = Date.now()) {
      taps = [...taps.filter((at) => now - at < windowMs), now]
      if (taps.length >= count) {
        taps = []
        return true
      }
      return false
    },
  }
}

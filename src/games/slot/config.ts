export const SLOT_CONFIG = {
  reelCount: 3,
  baseSpinMs: 1200,
  baseSpinReducedMs: 0,
  reelStopDelayMs: 500,
  reelStopDelayReducedMs: 50,
  cycleIntervalMs: 80,
  cycleIntervalReducedMs: 0,
  controlMinSizePx: 44,
} as const

export const REEL_STOP_ORDER = [0, 1, 2] as const

export function resolveBaseSpinMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? SLOT_CONFIG.baseSpinReducedMs : SLOT_CONFIG.baseSpinMs
}

export function resolveReelStopDelayMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? SLOT_CONFIG.reelStopDelayReducedMs : SLOT_CONFIG.reelStopDelayMs
}

export function resolveCycleIntervalMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? SLOT_CONFIG.cycleIntervalReducedMs : SLOT_CONFIG.cycleIntervalMs
}

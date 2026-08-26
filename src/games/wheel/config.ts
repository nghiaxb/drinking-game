import type { WheelItem } from './types'

export const WHEEL_STORAGE_KEY_ITEMS = 'game:wheel:items'

export const DEFAULT_WHEEL_ITEMS: WheelItem[] = [
  { id: 'drink-50', label: 'Uống 50%', enabled: true },
  { id: 'drink-100', label: 'Uống 100%', enabled: true },
  { id: 'designate', label: 'Chỉ định người', enabled: true },
  { id: 'together', label: 'Đồng khởi', enabled: true },
  { id: 'free', label: 'Miễn uống', enabled: true },
  { id: 'double', label: 'Double', enabled: true },
]

/**
 * Fill plus the text colour that is legible on it. The old palette put white on every wedge, and
 * 7 of its 12 colours failed AA for that text — the amber wedge measured 2.19:1. Dark and light
 * alternate so neighbouring wedges never blur into one another either.
 */
export interface WheelSegmentStyle {
  fill: string
  text: string
}

export const WHEEL_SEGMENT_STYLES: readonly WheelSegmentStyle[] = [
  { fill: '#c8402f', text: '#ffffff' },
  { fill: '#e9a83c', text: '#2d2420' },
  { fill: '#16776a', text: '#ffffff' },
  { fill: '#8ec9ae', text: '#2d2420' },
  { fill: '#5d4497', text: '#ffffff' },
  { fill: '#dfc255', text: '#2d2420' },
  { fill: '#2f7ea6', text: '#ffffff' },
  { fill: '#f0b9a4', text: '#2d2420' },
  { fill: '#b03a5b', text: '#ffffff' },
  { fill: '#c7d99a', text: '#2d2420' },
  { fill: '#3f4b8c', text: '#ffffff' },
  { fill: '#e0cfa8', text: '#2d2420' },
]

export function wheelSegmentStyleAt(index: number): WheelSegmentStyle {
  const styles = WHEEL_SEGMENT_STYLES
  const safe = ((index % styles.length) + styles.length) % styles.length
  return styles[safe] ?? styles[0]!
}

export const WHEEL_CONFIG = {
  minEnabledItems: 2,
  minFullSpins: 3,
  spinDurationMs: 4000,
  spinDurationReducedMs: 0,
  tickIntervalMs: 120,
  controlMinSizePx: 44,
  maxLabelLength: 40,
} as const

export function resolveSpinDurationMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? WHEEL_CONFIG.spinDurationReducedMs : WHEEL_CONFIG.spinDurationMs
}

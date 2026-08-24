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

export const WHEEL_SEGMENT_COLORS = [
  '#e94560',
  '#0f3460',
  '#533483',
  '#16a085',
  '#f39c12',
  '#3498db',
  '#9b59b6',
  '#2ecc71',
  '#e67e22',
  '#1abc9c',
  '#c0392b',
  '#8e44ad',
] as const

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

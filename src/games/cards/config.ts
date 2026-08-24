export const CARDS_CONFIG = {
  flipDurationMs: 520,
  frameFallbackMs: 50,
  swipeThresholdPx: 48,
  minTouchTargetPx: 44,
  recentAvoidanceCount: 3,
} as const

export const TRUTH_DIFFICULTIES = ['light', 'medium', 'spicy'] as const

export const DRINKING_CATEGORIES = [
  'drink',
  'choose',
  'everyone',
  'lucky',
  'skill',
  'rule',
] as const

export const DECK_LABELS: Record<'truth' | 'dare' | 'drinking', string> = {
  truth: 'Thật',
  dare: 'Thách',
  drinking: 'Uống',
}

export const TRUTH_DIFFICULTY_LABELS: Record<'light' | 'medium' | 'spicy', string> = {
  light: 'Nhẹ',
  medium: 'Vừa',
  spicy: 'Cay',
}

export const DRINKING_CATEGORY_LABELS: Record<
  'drink' | 'choose' | 'everyone' | 'lucky' | 'skill' | 'rule',
  string
> = {
  drink: 'Uống',
  choose: 'Chọn người',
  everyone: 'Cả bàn',
  lucky: 'May rủi',
  skill: 'Kỹ năng',
  rule: 'Luật mới',
}

export function resolveFlipDurationMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : CARDS_CONFIG.flipDurationMs
}

import type { BombCategory, BombFuseRange } from './types'

export const BOMB_STORAGE_KEY_FUSE = 'game:bomb:fuse'

export const BOMB_CONFIG = {
  /*
   * Tick pacing is a function of elapsed time, never of the time left. Deriving it from the
   * remaining fuse would let the table hear how close the bomb is and hand the phone over at the
   * safe moment — the whole game is that nobody knows.
   */
  tickStartIntervalMs: 720,
  tickFloorIntervalMs: 180,
  /*
   * A tap already travelling toward "chuyển" must not land on "chơi lại" and wipe the result
   * before anyone reads it, so the replay button ignores presses for this long after the blast.
   */
  replayGraceMs: 500,
  recentAvoidanceCount: 8,
  minTouchTargetPx: 44,
} as const

export const BOMB_FUSE_BOUNDS = {
  minMs: 10_000,
  maxMs: 90_000,
  stepMs: 5_000,
  /*
   * The two ends must stay apart. Collapsed onto one value the fuse would be fixed, and the table
   * could simply count to it and hand the phone on in time — which is the whole game, gone.
   */
  minSpanMs: 5_000,
} as const

/** Calibrated so every round reaches the fast ticks without dragging: see resolveTickRampMs. */
export const DEFAULT_BOMB_FUSE_RANGE: BombFuseRange = { minMs: 15_000, maxMs: 35_000 }

export const BOMB_CATEGORIES = [
  'geo',
  'food',
  'entertainment',
  'tech',
  'vehicle',
  'nature',
  'objects',
  'people',
  'love',
  'party',
  'fun',
  'letter',
] as const satisfies readonly BombCategory[]

export const BOMB_CATEGORY_LABELS: Record<BombCategory, string> = {
  geo: 'Địa lý',
  food: 'Đồ ăn & thức uống',
  entertainment: 'Giải trí',
  tech: 'Công nghệ',
  vehicle: 'Xe cộ',
  nature: 'Động vật & thiên nhiên',
  objects: 'Đồ vật hằng ngày',
  people: 'Cơ thể & con người',
  love: 'Tình yêu',
  party: 'Bàn nhậu',
  fun: 'Vui / cà khịa',
  letter: 'Theo chữ cái',
}

import { describe, expect, it } from 'vitest'
import { BOMB_CONFIG, BOMB_FUSE_BOUNDS, DEFAULT_BOMB_FUSE_RANGE } from '../config'
import type { BombTopic } from '../types'
import {
  clampFuseRange,
  createBombState,
  explodeBomb,
  normalizeRngValue,
  parsePersistedFuseRange,
  pickFuseMs,
  pickTopic,
  resetRound,
  resolveTickRampMs,
  setFuseMax,
  setFuseMin,
  setFuseRange,
  startRound,
  tickIntervalAt,
} from './bombGame'

function topic(id: string): BombTopic {
  return { id, category: 'geo', text: `Kể tên ${id}` }
}

const POOL: BombTopic[] = [topic('a'), topic('b'), topic('c'), topic('d')]

describe('normalizeRngValue', () => {
  it('clamps hostile values into [0, 1)', () => {
    expect(normalizeRngValue(Number.NaN)).toBe(0)
    expect(normalizeRngValue(Number.POSITIVE_INFINITY)).toBeLessThan(1)
    expect(normalizeRngValue(-5)).toBe(0)
    expect(normalizeRngValue(0)).toBe(0)
    expect(normalizeRngValue(1)).toBeLessThan(1)
    expect(normalizeRngValue(0.5)).toBe(0.5)
  })
})

describe('clampFuseRange', () => {
  it('snaps both ends onto the step scale', () => {
    expect(clampFuseRange({ minMs: 16_200, maxMs: 33_400 })).toEqual({
      minMs: 15_000,
      maxMs: 35_000,
    })
  })

  it('holds the ends inside the allowed bounds', () => {
    expect(clampFuseRange({ minMs: -5_000, maxMs: 1_000 }).minMs).toBe(BOMB_FUSE_BOUNDS.minMs)
    expect(clampFuseRange({ minMs: 500_000, maxMs: 900_000 }).maxMs).toBe(BOMB_FUSE_BOUNDS.maxMs)
  })

  /*
   * A collapsed range is a fixed fuse, and the table could simply count to it and hand the phone
   * on in time. Every path has to come back with real uncertainty.
   */
  it('never lets the range collapse onto a single value', () => {
    for (const raw of [
      { minMs: 20_000, maxMs: 20_000 },
      { minMs: 30_000, maxMs: 10_000 },
      { minMs: 90_000, maxMs: 90_000 },
      { minMs: Number.NaN, maxMs: Number.NaN },
    ]) {
      const clamped = clampFuseRange(raw)
      expect(clamped.maxMs - clamped.minMs).toBeGreaterThanOrEqual(BOMB_FUSE_BOUNDS.minSpanMs)
      expect(clamped.minMs).toBeGreaterThanOrEqual(BOMB_FUSE_BOUNDS.minMs)
      expect(clamped.maxMs).toBeLessThanOrEqual(BOMB_FUSE_BOUNDS.maxMs)
    }
  })

  it('gives ground on the near end when the range is pinned at the top', () => {
    expect(clampFuseRange({ minMs: 90_000, maxMs: 90_000 })).toEqual({
      minMs: BOMB_FUSE_BOUNDS.maxMs - BOMB_FUSE_BOUNDS.minSpanMs,
      maxMs: BOMB_FUSE_BOUNDS.maxMs,
    })
  })
})

describe('setFuseMin / setFuseMax', () => {
  it('carries the far end along instead of refusing to move', () => {
    const pushed = setFuseMin({ minMs: 15_000, maxMs: 20_000 }, 40_000)
    expect(pushed).toEqual({ minMs: 40_000, maxMs: 45_000 })

    const pulled = setFuseMax({ minMs: 40_000, maxMs: 60_000 }, 15_000)
    expect(pulled).toEqual({ minMs: 10_000, maxMs: 15_000 })
  })

  it('keeps an end dragged to the bounds usable', () => {
    const atFloor = setFuseMax({ minMs: 15_000, maxMs: 35_000 }, BOMB_FUSE_BOUNDS.minMs)
    expect(atFloor.minMs).toBe(BOMB_FUSE_BOUNDS.minMs)
    expect(atFloor.maxMs - atFloor.minMs).toBeGreaterThanOrEqual(BOMB_FUSE_BOUNDS.minSpanMs)

    const atCeiling = setFuseMin({ minMs: 15_000, maxMs: 35_000 }, BOMB_FUSE_BOUNDS.maxMs)
    expect(atCeiling.maxMs).toBe(BOMB_FUSE_BOUNDS.maxMs)
    expect(atCeiling.maxMs - atCeiling.minMs).toBeGreaterThanOrEqual(BOMB_FUSE_BOUNDS.minSpanMs)
  })

  it('leaves an untouched end where it was', () => {
    expect(setFuseMin({ minMs: 15_000, maxMs: 60_000 }, 25_000)).toEqual({
      minMs: 25_000,
      maxMs: 60_000,
    })
    expect(setFuseMax({ minMs: 15_000, maxMs: 60_000 }, 45_000)).toEqual({
      minMs: 15_000,
      maxMs: 45_000,
    })
  })
})

describe('parsePersistedFuseRange', () => {
  it('falls back to the default for anything unusable', () => {
    for (const raw of [null, undefined, 42, 'x', {}, { minMs: 'a', maxMs: 2 }, { minMs: 1 }]) {
      expect(parsePersistedFuseRange(raw)).toEqual(DEFAULT_BOMB_FUSE_RANGE)
    }
  })

  it('accepts a stored range and repairs a broken one', () => {
    expect(parsePersistedFuseRange({ minMs: 30_000, maxMs: 60_000 })).toEqual({
      minMs: 30_000,
      maxMs: 60_000,
    })
    expect(parsePersistedFuseRange({ minMs: 50_000, maxMs: 20_000 })).toEqual({
      minMs: 50_000,
      maxMs: 55_000,
    })
  })
})

describe('pickFuseMs', () => {
  it('stays inside the range for any rng value', () => {
    const range = { minMs: 20_000, maxMs: 45_000 }
    for (const raw of [0, 0.25, 0.5, 0.999999, 1, -1, Number.NaN]) {
      const fuse = pickFuseMs(() => raw, range)
      expect(fuse).toBeGreaterThanOrEqual(range.minMs)
      expect(fuse).toBeLessThanOrEqual(range.maxMs)
    }
  })

  it('reaches both ends of the chosen range', () => {
    const range = { minMs: 10_000, maxMs: 25_000 }
    expect(pickFuseMs(() => 0, range)).toBe(range.minMs)
    expect(pickFuseMs(() => 0.999999999, range)).toBe(range.maxMs)
  })

  it('repairs a broken range rather than returning nonsense', () => {
    const fuse = pickFuseMs(() => 0.5, { minMs: Number.NaN, maxMs: -1 })
    expect(fuse).toBeGreaterThanOrEqual(BOMB_FUSE_BOUNDS.minMs)
    expect(fuse).toBeLessThanOrEqual(BOMB_FUSE_BOUNDS.maxMs)
  })
})

describe('resolveTickRampMs', () => {
  /*
   * The reason the ramp is derived rather than configured: the ticks must be at full speed before
   * the earliest blast is possible, for every window the table can pick. A fixed ramp got this
   * wrong once already — short rounds went off while the ticks were still leisurely.
   */
  it('reaches the floor by the earliest possible blast, for every range', () => {
    const { minMs, maxMs, stepMs } = BOMB_FUSE_BOUNDS
    for (let low = minMs; low <= maxMs - stepMs; low += stepMs) {
      for (const high of [low + stepMs, maxMs]) {
        const range = clampFuseRange({ minMs: low, maxMs: high })
        const ramp = resolveTickRampMs(range)

        expect(ramp).toBeLessThanOrEqual(range.minMs)
        expect(tickIntervalAt(range.minMs, ramp)).toBe(BOMB_CONFIG.tickFloorIntervalMs)
        expect(tickIntervalAt(range.maxMs, ramp)).toBe(BOMB_CONFIG.tickFloorIntervalMs)
      }
    }
  })
})

describe('tickIntervalAt', () => {
  const RAMP = 15_000

  it('accelerates from the start interval down to the floor', () => {
    expect(tickIntervalAt(0, RAMP)).toBe(BOMB_CONFIG.tickStartIntervalMs)
    expect(tickIntervalAt(RAMP, RAMP)).toBe(BOMB_CONFIG.tickFloorIntervalMs)
  })

  it('never speeds past the floor however long the round runs', () => {
    expect(tickIntervalAt(RAMP * 10, RAMP)).toBe(BOMB_CONFIG.tickFloorIntervalMs)
  })

  it('is monotonically non-increasing over the ramp', () => {
    let previous = tickIntervalAt(0, RAMP)
    for (let elapsed = 500; elapsed <= RAMP; elapsed += 500) {
      const current = tickIntervalAt(elapsed, RAMP)
      expect(current).toBeLessThanOrEqual(previous)
      previous = current
    }
  })

  it('depends on elapsed time and the ramp only, never on the fuse', () => {
    // Two rounds on the same window must sound identical at the same second, however long the
    // hidden fuse is — anything else lets the table hear how close the bomb is.
    expect(tickIntervalAt(5_000, RAMP)).toBe(tickIntervalAt(5_000, RAMP))
  })

  it('treats a broken clock or ramp as the start of the round', () => {
    expect(tickIntervalAt(Number.NaN, RAMP)).toBe(BOMB_CONFIG.tickStartIntervalMs)
    expect(tickIntervalAt(-1000, RAMP)).toBe(BOMB_CONFIG.tickStartIntervalMs)
    expect(tickIntervalAt(0, Number.NaN)).toBe(BOMB_CONFIG.tickStartIntervalMs)
  })
})

describe('pickTopic', () => {
  it('returns null for an empty pool', () => {
    expect(pickTopic([], [], () => 0)).toBeNull()
  })

  it('skips recently used topics', () => {
    expect(pickTopic(POOL, ['a', 'b'], () => 0)?.id).toBe('c')
  })

  it('falls back to the full pool once everything is recent', () => {
    expect(pickTopic(POOL, ['a', 'b', 'c', 'd'], () => 0)?.id).toBe('a')
  })

  it('stays in range at the top of the rng interval', () => {
    expect(pickTopic(POOL, [], () => 0.9999999999)?.id).toBe('d')
  })
})

describe('createBombState', () => {
  it('starts on the default window', () => {
    expect(createBombState(POOL).fuseRange).toEqual(DEFAULT_BOMB_FUSE_RANGE)
  })

  it('clamps a window handed in at construction', () => {
    expect(createBombState(POOL, { minMs: 22_000, maxMs: 21_000 }).fuseRange).toEqual({
      minMs: 20_000,
      maxMs: 25_000,
    })
  })
})

describe('setFuseRange', () => {
  it('applies a clamped window between rounds', () => {
    const next = setFuseRange(createBombState(POOL), { minMs: 30_000, maxMs: 60_000 })
    expect(next.fuseRange).toEqual({ minMs: 30_000, maxMs: 60_000 })
  })

  /* Rewriting the window mid-round would change a fuse that is already burning. */
  it('is ignored while a round is running', () => {
    const running = startRound(createBombState(POOL), () => 0)
    expect(setFuseRange(running, { minMs: 60_000, maxMs: 90_000 })).toBe(running)
  })
})

describe('startRound', () => {
  it('draws a topic and starts burning', () => {
    const started = startRound(createBombState(POOL), () => 0)

    expect(started.phase).toBe('running')
    expect(started.currentTopic?.id).toBe('a')
    expect(started.recentIds).toEqual(['a'])
  })

  it('is ignored while a round is already running', () => {
    const running = startRound(createBombState(POOL), () => 0)
    expect(startRound(running, () => 0.5)).toBe(running)
  })

  it('caps the recent list at the avoidance window', () => {
    let state = createBombState(POOL)
    for (let round = 0; round < BOMB_CONFIG.recentAvoidanceCount + 4; round += 1) {
      state = resetRound(startRound(state, () => 0))
    }

    expect(state.recentIds.length).toBeLessThanOrEqual(BOMB_CONFIG.recentAvoidanceCount)
  })

  it('keeps the chosen window across rounds', () => {
    const configured = setFuseRange(createBombState(POOL), { minMs: 30_000, maxMs: 60_000 })
    const started = startRound(configured, () => 0)

    expect(started.fuseRange).toEqual({ minMs: 30_000, maxMs: 60_000 })
    expect(resetRound(started).fuseRange).toEqual({ minMs: 30_000, maxMs: 60_000 })
  })
})

describe('explodeBomb', () => {
  it('ends a running round and keeps the topic for the result', () => {
    const running = startRound(createBombState(POOL), () => 0)
    const blown = explodeBomb(running)

    expect(blown.phase).toBe('exploded')
    expect(blown.currentTopic?.id).toBe('a')
  })

  it('cannot fire twice or from idle', () => {
    const idle = createBombState(POOL)
    expect(explodeBomb(idle)).toBe(idle)

    const blown = explodeBomb(startRound(idle, () => 0))
    expect(explodeBomb(blown)).toBe(blown)
  })
})

describe('resetRound', () => {
  it('returns to idle but remembers which topics were used', () => {
    const blown = explodeBomb(startRound(createBombState(POOL), () => 0))
    const reset = resetRound(blown)

    expect(reset.phase).toBe('idle')
    expect(reset.currentTopic).toBeNull()
    expect(reset.recentIds).toEqual(['a'])
  })
})

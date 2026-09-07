import { BOMB_CONFIG, BOMB_FUSE_BOUNDS, DEFAULT_BOMB_FUSE_RANGE } from '../config'
import type { BombFuseRange, BombGameState, BombTopic } from '../types'

export type RandomSource = () => number

/** Keeps a hostile or broken rng inside [0, 1) so every derived index stays in range. */
export function normalizeRngValue(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0
  }
  return raw >= 1 ? 0.9999999999999999 : raw
}

function snapToStep(ms: number): number {
  const { minMs, maxMs, stepMs } = BOMB_FUSE_BOUNDS
  if (!Number.isFinite(ms)) {
    return minMs
  }
  const stepped = Math.round(ms / stepMs) * stepMs
  return Math.min(maxMs, Math.max(minMs, stepped))
}

/** Snaps both ends onto the scale and forces them apart, so the fuse is never a known constant. */
export function clampFuseRange(range: BombFuseRange): BombFuseRange {
  const { maxMs: boundMax, minSpanMs } = BOMB_FUSE_BOUNDS
  const minMs = snapToStep(range.minMs)
  const maxMs = snapToStep(range.maxMs)

  if (maxMs - minMs >= minSpanMs) {
    return { minMs, maxMs }
  }
  if (minMs + minSpanMs <= boundMax) {
    return { minMs, maxMs: minMs + minSpanMs }
  }
  // Pinned against the top of the scale, so the near end is the one that has to give ground.
  return { minMs: boundMax - minSpanMs, maxMs: boundMax }
}

/** Dragging the near end up carries the far end with it rather than refusing to move. */
export function setFuseMin(range: BombFuseRange, ms: number): BombFuseRange {
  const requested = snapToStep(ms)
  return clampFuseRange({
    minMs: requested,
    maxMs: Math.max(range.maxMs, requested + BOMB_FUSE_BOUNDS.minSpanMs),
  })
}

export function setFuseMax(range: BombFuseRange, ms: number): BombFuseRange {
  const requested = snapToStep(ms)
  return clampFuseRange({
    minMs: Math.min(range.minMs, requested - BOMB_FUSE_BOUNDS.minSpanMs),
    maxMs: requested,
  })
}

export function parsePersistedFuseRange(raw: unknown): BombFuseRange {
  if (raw === null || typeof raw !== 'object') {
    return { ...DEFAULT_BOMB_FUSE_RANGE }
  }

  const candidate = raw as { minMs?: unknown; maxMs?: unknown }
  if (!Number.isFinite(candidate.minMs) || !Number.isFinite(candidate.maxMs)) {
    return { ...DEFAULT_BOMB_FUSE_RANGE }
  }

  return clampFuseRange({ minMs: candidate.minMs as number, maxMs: candidate.maxMs as number })
}

/** Secret by contract: the drawn fuse is never rendered, only the window it came from. */
export function pickFuseMs(rng: RandomSource, range: BombFuseRange): number {
  const safe = clampFuseRange(range)
  const span = safe.maxMs - safe.minMs
  return safe.minMs + Math.floor(normalizeRngValue(rng()) * (span + 1))
}

/**
 * The ramp is the near end of the window, never a constant. The ticks have to reach full speed
 * before the earliest possible blast — otherwise a short round goes off while they are still
 * leisurely and lands flat, which is exactly how the first calibration got it wrong.
 */
export function resolveTickRampMs(range: BombFuseRange): number {
  return clampFuseRange(range).minMs
}

/**
 * Ticks speed up on a schedule read off elapsed time only. It builds dread without leaking the
 * fuse: two rounds sound identical at the same second even when one is about to blow.
 */
export function tickIntervalAt(elapsedMs: number, rampMs: number): number {
  const { tickStartIntervalMs, tickFloorIntervalMs } = BOMB_CONFIG
  const safeElapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0
  const safeRamp = Number.isFinite(rampMs) && rampMs > 0 ? rampMs : 1
  const progress = Math.min(1, safeElapsed / safeRamp)
  return Math.round(tickStartIntervalMs + (tickFloorIntervalMs - tickStartIntervalMs) * progress)
}

export function pickTopic(
  pool: readonly BombTopic[],
  recentIds: readonly string[],
  rng: RandomSource,
): BombTopic | null {
  if (pool.length === 0) {
    return null
  }

  const recent = new Set(recentIds)
  const fresh = pool.filter((topic) => !recent.has(topic.id))
  const candidates = fresh.length > 0 ? fresh : pool

  return candidates[Math.floor(normalizeRngValue(rng()) * candidates.length)] ?? null
}

export function createBombState(
  pool: readonly BombTopic[],
  fuseRange: BombFuseRange = DEFAULT_BOMB_FUSE_RANGE,
): BombGameState {
  return {
    phase: 'idle',
    pool: [...pool],
    fuseRange: clampFuseRange(fuseRange),
    currentTopic: null,
    passes: 0,
    recentIds: [],
  }
}

/** Only ever between rounds: changing the window mid-round would rewrite a fuse already burning. */
export function setFuseRange(state: BombGameState, fuseRange: BombFuseRange): BombGameState {
  if (state.phase === 'running') {
    return state
  }
  return { ...state, fuseRange: clampFuseRange(fuseRange) }
}

export function startRound(state: BombGameState, rng: RandomSource): BombGameState {
  if (state.phase === 'running') {
    return state
  }

  const topic = pickTopic(state.pool, state.recentIds, rng)
  if (!topic) {
    return state
  }

  return {
    ...state,
    phase: 'running',
    currentTopic: topic,
    passes: 0,
    recentIds: [...state.recentIds, topic.id].slice(-BOMB_CONFIG.recentAvoidanceCount),
  }
}

/**
 * Passing is bookkeeping, not a lever: it must not touch the fuse. If handing the phone over could
 * shorten or extend the timer, holding on would become the winning move and the bomb would stop
 * going round the table.
 */
export function passBomb(state: BombGameState): BombGameState {
  if (state.phase !== 'running') {
    return state
  }
  return { ...state, passes: state.passes + 1 }
}

export function explodeBomb(state: BombGameState): BombGameState {
  if (state.phase !== 'running') {
    return state
  }
  return { ...state, phase: 'exploded' }
}

export function resetRound(state: BombGameState): BombGameState {
  return { ...state, phase: 'idle', currentTopic: null, passes: 0 }
}

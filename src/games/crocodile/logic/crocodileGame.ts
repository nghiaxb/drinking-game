import { CROCODILE_CONFIG } from '../config'
import type { ForcedOutcome } from '@/cheat/cheatTypes'
import type { CrocodileGameState, PressToothResult } from '../types'

export type RandomSource = () => number

export function isValidToothIndex(toothIndex: number, toothCount: number): boolean {
  return Number.isInteger(toothIndex) && toothIndex >= 0 && toothIndex < toothCount
}

export function clampTrapIndex(value: number, toothCount: number): number {
  if (toothCount <= 0) {
    return 0
  }
  if (!Number.isFinite(value)) {
    return value === Number.POSITIVE_INFINITY ? toothCount - 1 : 0
  }
  const floored = Math.floor(value)
  return Math.min(toothCount - 1, Math.max(0, floored))
}

export function selectTrapIndex(rng: RandomSource, toothCount: number): number {
  const raw = rng()
  if (!Number.isFinite(raw)) {
    return 0
  }
  return clampTrapIndex(Math.floor(raw * toothCount), toothCount)
}

export function createInitialState(
  rng: RandomSource,
  toothCount: number = CROCODILE_CONFIG.toothCount,
): CrocodileGameState {
  return {
    phase: 'playing',
    toothCount,
    trapIndex: selectTrapIndex(rng, toothCount),
    pressedIndices: [],
  }
}

export function isTerminal(state: CrocodileGameState): boolean {
  return state.phase === 'bitten'
}

export function isToothDisabled(state: CrocodileGameState, toothIndex: number): boolean {
  if (isTerminal(state)) {
    return true
  }
  return state.pressedIndices.includes(toothIndex)
}

/** Uniform pick among teeth that are neither pressed nor the excluded one; null when none exist. */
function pickTrapRelocation(
  state: CrocodileGameState,
  excludedIndex: number,
  rng: RandomSource,
): number | null {
  const candidates: number[] = []
  for (let index = 0; index < state.toothCount; index += 1) {
    if (index !== excludedIndex && !state.pressedIndices.includes(index)) {
      candidates.push(index)
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // clampTrapIndex also absorbs a non-finite rng, which the rest of this module guards against too.
  const pick = clampTrapIndex(Math.floor(rng() * candidates.length), candidates.length)
  return candidates[pick] ?? null
}

export function pressTooth(
  state: CrocodileGameState,
  toothIndex: number,
  forced?: ForcedOutcome,
  rng: RandomSource = Math.random,
): PressToothResult {
  if (!isValidToothIndex(toothIndex, state.toothCount)) {
    return { state, outcome: 'ignored' }
  }

  if (isTerminal(state) || state.pressedIndices.includes(toothIndex)) {
    return { state, outcome: 'ignored' }
  }

  const pressedIndices = [...state.pressedIndices, toothIndex]

  if (forced === 'lose') {
    return {
      state: { ...state, phase: 'bitten', trapIndex: toothIndex, pressedIndices },
      outcome: 'trap',
    }
  }

  if (forced === 'win' && toothIndex === state.trapIndex) {
    const relocated = pickTrapRelocation(state, toothIndex, rng)
    if (relocated !== null) {
      return { state: { ...state, trapIndex: relocated, pressedIndices }, outcome: 'safe' }
    }
  }

  if (toothIndex === state.trapIndex) {
    return {
      state: {
        ...state,
        phase: 'bitten',
        pressedIndices,
      },
      outcome: 'trap',
    }
  }

  return {
    state: {
      ...state,
      pressedIndices,
    },
    outcome: 'safe',
  }
}

export function resetGame(
  rng: RandomSource,
  toothCount: number = CROCODILE_CONFIG.toothCount,
): CrocodileGameState {
  return createInitialState(rng, toothCount)
}

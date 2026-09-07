import { MINE_CONFIG } from '../config'
import type { ForcedOutcome } from '@/cheat/cheatTypes'
import type { MineGameState, PressCellResult } from '../types'

export type RandomSource = () => number

export function normalizeGridSize(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 2) {
    return MINE_CONFIG.gridSize
  }
  return value
}

export function isValidCellIndex(cellIndex: number, gridSize: number): boolean {
  const normalizedGridSize = normalizeGridSize(gridSize)
  const cellCount = normalizedGridSize * normalizedGridSize
  return Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < cellCount
}

export function clampMineCount(value: number, gridSize: number): number {
  const normalizedGridSize = normalizeGridSize(gridSize)
  const cellCount = normalizedGridSize * normalizedGridSize
  const maxAllowed = Math.min(MINE_CONFIG.maxMineCount, cellCount - 1)

  if (!Number.isFinite(value)) {
    return MINE_CONFIG.minMineCount
  }

  const floored = Math.floor(value)
  return Math.min(maxAllowed, Math.max(MINE_CONFIG.minMineCount, floored))
}

export function normalizeRngValue(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0
  }
  if (raw <= 0) {
    return 0
  }
  if (raw >= 1) {
    return 0.9999999999999999
  }
  return raw
}

export function shuffleIndices(length: number, rng: RandomSource): number[] {
  const indices = Array.from({ length }, (_, index) => index)

  for (let index = length - 1; index > 0; index -= 1) {
    const raw = normalizeRngValue(rng())
    const swapIndex = Math.floor(raw * (index + 1))
    const current = indices[index] ?? 0
    indices[index] = indices[swapIndex] ?? 0
    indices[swapIndex] = current
  }

  return indices
}

export function generateMineIndices(
  rng: RandomSource,
  gridSize: number,
  mineCount: number,
): number[] {
  const normalizedGridSize = normalizeGridSize(gridSize)
  const cellCount = normalizedGridSize * normalizedGridSize
  const clampedCount = clampMineCount(mineCount, normalizedGridSize)
  const shuffled = shuffleIndices(cellCount, rng)
  return shuffled.slice(0, clampedCount)
}

export function createInitialState(
  rng: RandomSource,
  gridSize: number = MINE_CONFIG.gridSize,
  mineCount: number = MINE_CONFIG.mineCount,
): MineGameState {
  const normalizedGridSize = normalizeGridSize(gridSize)
  const clampedMineCount = clampMineCount(mineCount, normalizedGridSize)

  return {
    phase: 'playing',
    gridSize: normalizedGridSize,
    mineCount: clampedMineCount,
    mineIndices: generateMineIndices(rng, normalizedGridSize, clampedMineCount),
    revealedIndices: [],
    hitMineIndex: null,
  }
}

export function isTerminal(state: MineGameState): boolean {
  return state.phase === 'exploded'
}

export function isCellDisabled(state: MineGameState, cellIndex: number): boolean {
  if (isTerminal(state)) {
    return true
  }
  return state.revealedIndices.includes(cellIndex)
}

/**
 * Chance the next press hits a mine, as 0..1. This is what makes the game tense — it climbs from
 * 1/25 to a certainty as tiles run out — so the view shows it rather than leaving players guessing.
 */
export function computeNextRisk(state: MineGameState): number {
  const cellCount = normalizeGridSize(state.gridSize) ** 2
  const unopened = cellCount - state.revealedIndices.length

  if (unopened <= 0) {
    return 0
  }

  const revealed = new Set(state.revealedIndices)
  const minesLeft = state.mineIndices.filter((index) => !revealed.has(index)).length

  return Math.min(1, minesLeft / unopened)
}

/** Uniform pick among cells that are unrevealed, not a mine, and not the excluded one. */
function pickMineRelocation(
  state: MineGameState,
  excludedIndex: number,
  rng: RandomSource,
): number | null {
  const cellCount = normalizeGridSize(state.gridSize) ** 2
  const revealed = new Set(state.revealedIndices)
  const mines = new Set(state.mineIndices)
  const candidates: number[] = []

  for (let index = 0; index < cellCount; index += 1) {
    if (index !== excludedIndex && !revealed.has(index) && !mines.has(index)) {
      candidates.push(index)
    }
  }

  if (candidates.length === 0) {
    return null
  }

  const pick = Math.floor(normalizeRngValue(rng()) * candidates.length)
  return candidates[Math.min(candidates.length - 1, pick)] ?? null
}

export function pressCell(
  state: MineGameState,
  cellIndex: number,
  forced?: ForcedOutcome,
  rng: RandomSource = Math.random,
): PressCellResult {
  if (!isValidCellIndex(cellIndex, state.gridSize)) {
    return { state, outcome: 'ignored' }
  }

  if (isTerminal(state) || state.revealedIndices.includes(cellIndex)) {
    return { state, outcome: 'ignored' }
  }

  const revealedIndices = [...state.revealedIndices, cellIndex]
  const isMine = state.mineIndices.includes(cellIndex)

  if (forced === 'lose' && !isMine) {
    /*
     * Swap rather than append: computeNextRisk and the "đã bắt x/24" counter both read
     * mineIndices, so a changed length would visibly shift the odds in front of the table.
     */
    const [, ...rest] = state.mineIndices
    return {
      state: {
        ...state,
        phase: 'exploded',
        mineIndices: [...rest, cellIndex],
        revealedIndices,
        hitMineIndex: cellIndex,
      },
      outcome: 'mine',
    }
  }

  if (forced === 'win' && isMine) {
    const relocated = pickMineRelocation(state, cellIndex, rng)
    if (relocated !== null) {
      return {
        state: {
          ...state,
          mineIndices: state.mineIndices.map((index) => (index === cellIndex ? relocated : index)),
          revealedIndices,
        },
        outcome: 'safe',
      }
    }
  }

  if (isMine) {
    return {
      state: {
        ...state,
        phase: 'exploded',
        revealedIndices,
        hitMineIndex: cellIndex,
      },
      outcome: 'mine',
    }
  }

  return {
    state: {
      ...state,
      revealedIndices,
    },
    outcome: 'safe',
  }
}

export function resetGame(
  rng: RandomSource,
  gridSize: number = MINE_CONFIG.gridSize,
  mineCount: number = MINE_CONFIG.mineCount,
): MineGameState {
  return createInitialState(rng, gridSize, mineCount)
}

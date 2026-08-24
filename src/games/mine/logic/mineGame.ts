import { MINE_CONFIG } from '../config'
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

export function pressCell(state: MineGameState, cellIndex: number): PressCellResult {
  if (!isValidCellIndex(cellIndex, state.gridSize)) {
    return { state, outcome: 'ignored' }
  }

  if (isTerminal(state) || state.revealedIndices.includes(cellIndex)) {
    return { state, outcome: 'ignored' }
  }

  const revealedIndices = [...state.revealedIndices, cellIndex]
  const isMine = state.mineIndices.includes(cellIndex)

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

import { describe, it, expect } from 'vitest'
import { MINE_CONFIG } from '../config'
import {
  clampMineCount,
  createInitialState,
  generateMineIndices,
  isCellDisabled,
  isTerminal,
  normalizeGridSize,
  pressCell,
  resetGame,
} from './mineGame'

describe('mineGame', () => {
  describe('normalizeGridSize', () => {
    it('accepts finite integers >= 2', () => {
      expect(normalizeGridSize(2)).toBe(2)
      expect(normalizeGridSize(5)).toBe(5)
    })

    it('falls back to default for invalid grid sizes', () => {
      const invalid = [0, -1, 1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]

      for (const gridSize of invalid) {
        expect(normalizeGridSize(gridSize)).toBe(MINE_CONFIG.gridSize)
      }
    })
  })

  describe('generateMineIndices / clampMineCount', () => {
    it('generates unique mine positions within grid boundaries', () => {
      const indices = generateMineIndices(() => 0.5, 5, 1)

      expect(indices).toHaveLength(1)
      expect(indices[0]).toBeGreaterThanOrEqual(0)
      expect(indices[0]).toBeLessThan(25)
    })

    it('generates the requested mine count for future 2/3 mine modes', () => {
      const twoMines = generateMineIndices(() => 0.3, 5, 2)
      const threeMines = generateMineIndices(() => 0.7, 5, 3)

      expect(new Set(twoMines).size).toBe(2)
      expect(new Set(threeMines).size).toBe(3)
      expect(twoMines.every((index) => index >= 0 && index < 25)).toBe(true)
      expect(threeMines.every((index) => index >= 0 && index < 25)).toBe(true)
    })

    it('clamps mine count to configured min/max and grid capacity', () => {
      expect(clampMineCount(0, 5)).toBe(MINE_CONFIG.minMineCount)
      expect(clampMineCount(-5, 5)).toBe(MINE_CONFIG.minMineCount)
      expect(clampMineCount(99, 5)).toBe(MINE_CONFIG.maxMineCount)
      expect(clampMineCount(2.9, 5)).toBe(2)
    })

    it('clamps mine count on a 2x2 grid to leave at least one safe cell', () => {
      expect(clampMineCount(1, 2)).toBe(1)
      expect(clampMineCount(99, 2)).toBe(3)
    })

    it('normalizes invalid grid size before clamping mine count', () => {
      expect(clampMineCount(99, 0)).toBe(MINE_CONFIG.maxMineCount)
      expect(clampMineCount(99, Number.NaN)).toBe(MINE_CONFIG.maxMineCount)
    })

    it('falls back safely when RNG returns non-finite or boundary values', () => {
      const nanResult = generateMineIndices(() => Number.NaN, 5, 1)
      const infResult = generateMineIndices(() => Number.POSITIVE_INFINITY, 5, 1)
      const zeroResult = generateMineIndices(() => 0, 5, 1)
      const oneResult = generateMineIndices(() => 1, 5, 1)

      expect(nanResult).toHaveLength(1)
      expect(infResult).toHaveLength(1)
      expect(zeroResult).toHaveLength(1)
      expect(oneResult).toHaveLength(1)
      expect(nanResult[0]).toBeGreaterThanOrEqual(0)
      expect(nanResult[0]).toBeLessThan(25)
    })

    it('does not infinite-loop when RNG returns repeated values', () => {
      const indices = generateMineIndices(() => 0, 5, 3)

      expect(indices).toHaveLength(3)
      expect(new Set(indices).size).toBe(3)
    })

    it('is deterministic for a fixed RNG sequence', () => {
      const rngValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
      let index = 0
      const rng = () => rngValues[index++ % rngValues.length] ?? 0

      const first = generateMineIndices(rng, 5, 2)
      index = 0
      const second = generateMineIndices(rng, 5, 2)

      expect(first).toEqual(second)
    })
  })

  describe('createInitialState', () => {
    it('creates playing state with default grid and single mine', () => {
      const state = createInitialState(() => 0.25)

      expect(state.phase).toBe('playing')
      expect(state.gridSize).toBe(MINE_CONFIG.gridSize)
      expect(state.mineCount).toBe(MINE_CONFIG.mineCount)
      expect(state.revealedIndices).toEqual([])
      expect(state.hitMineIndex).toBeNull()
      expect(state.mineIndices).toHaveLength(1)
    })

    it('normalizes invalid grid size in initial state', () => {
      const state = createInitialState(() => 0.25, 0, 1)

      expect(state.gridSize).toBe(MINE_CONFIG.gridSize)
      expect(state.mineIndices.every((index) => index >= 0 && index < 25)).toBe(true)
    })
  })

  describe('pressCell', () => {
    it('ignores invalid cell indices without mutating state', () => {
      const initial = createInitialState(() => 0)
      const invalidIndices = [-1, 25, 1.5, Number.NaN, Number.POSITIVE_INFINITY]

      for (const cellIndex of invalidIndices) {
        const result = pressCell(initial, cellIndex)
        expect(result.outcome).toBe('ignored')
        expect(result.state).toEqual(initial)
      }
    })

    it('marks safe cell as revealed once and keeps playing', () => {
      const initial = createInitialState(() => 0)
      const mineSet = new Set(initial.mineIndices)
      const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1

      const { state, outcome } = pressCell(initial, safeIndex)

      expect(outcome).toBe('safe')
      expect(state.phase).toBe('playing')
      expect(state.revealedIndices).toContain(safeIndex)
    })

    it('disables safe cell after first press (repeat ignored)', () => {
      const initial = createInitialState(() => 0)
      const mineSet = new Set(initial.mineIndices)
      const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1
      const first = pressCell(initial, safeIndex)
      const second = pressCell(first.state, safeIndex)

      expect(second.outcome).toBe('ignored')
      expect(second.state).toEqual(first.state)
    })

    it('transitions to exploded terminal when mine cell is pressed', () => {
      const initial = createInitialState(() => 0.5)
      const mineIndex = initial.mineIndices[0] ?? 0

      const { state, outcome } = pressCell(initial, mineIndex)

      expect(outcome).toBe('mine')
      expect(state.phase).toBe('exploded')
      expect(state.hitMineIndex).toBe(mineIndex)
      expect(state.revealedIndices).toContain(mineIndex)
    })

    it('ignores all input after exploded terminal state', () => {
      const initial = createInitialState(() => 0.5)
      const mineIndex = initial.mineIndices[0] ?? 0
      const exploded = pressCell(initial, mineIndex)
      const mineSet = new Set(initial.mineIndices)
      const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1
      const after = pressCell(exploded.state, safeIndex)

      expect(after.outcome).toBe('ignored')
      expect(after.state).toEqual(exploded.state)
    })

    it('ignores repeat press on mine cell after exploded', () => {
      const initial = createInitialState(() => 0.5)
      const mineIndex = initial.mineIndices[0] ?? 0
      const exploded = pressCell(initial, mineIndex)
      const again = pressCell(exploded.state, mineIndex)

      expect(again.outcome).toBe('ignored')
      expect(again.state).toEqual(exploded.state)
    })
  })

  describe('resetGame', () => {
    it('creates a fresh round with new mines and cleared reveals', () => {
      const first = createInitialState(() => 0)
      const mineSet = new Set(first.mineIndices)
      const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1
      pressCell(first, safeIndex)

      const reset = resetGame(() => 0.99)

      expect(reset.phase).toBe('playing')
      expect(reset.revealedIndices).toEqual([])
      expect(reset.hitMineIndex).toBeNull()
      expect(reset.mineIndices).toHaveLength(1)
    })
  })

  describe('helpers', () => {
    it('reports terminal only in exploded phase', () => {
      const playing = createInitialState(() => 0.1)
      expect(isTerminal(playing)).toBe(false)

      const exploded = pressCell(playing, playing.mineIndices[0] ?? 0).state
      expect(isTerminal(exploded)).toBe(true)
    })

    it('disables revealed cells and all cells when terminal', () => {
      const initial = createInitialState(() => 0)
      const mineSet = new Set(initial.mineIndices)
      const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1
      const afterSafe = pressCell(initial, safeIndex).state

      expect(isCellDisabled(afterSafe, safeIndex)).toBe(true)
      expect(isCellDisabled(afterSafe, initial.mineIndices[0] ?? 0)).toBe(false)

      const exploded = pressCell(initial, initial.mineIndices[0] ?? 0).state
      for (let index = 0; index < 25; index += 1) {
        expect(isCellDisabled(exploded, index)).toBe(true)
      }
    })
  })
})

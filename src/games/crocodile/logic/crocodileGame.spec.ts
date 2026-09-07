import { describe, it, expect } from 'vitest'
import { CROCODILE_CONFIG } from '../config'
import {
  clampTrapIndex,
  createInitialState,
  isTerminal,
  isToothDisabled,
  pressTooth,
  resetGame,
  selectTrapIndex,
} from './crocodileGame'

describe('crocodileGame', () => {
  describe('selectTrapIndex / clampTrapIndex', () => {
    it('picks trap within tooth boundaries using injected RNG', () => {
      expect(selectTrapIndex(() => 0, 14)).toBe(0)
      expect(selectTrapIndex(() => 0.5, 14)).toBe(7)
      expect(selectTrapIndex(() => 0.999, 14)).toBe(13)
    })

    it('clamps out-of-range RNG values to valid trap indices', () => {
      expect(clampTrapIndex(20, 14)).toBe(13)
      expect(clampTrapIndex(-3, 14)).toBe(0)
      expect(clampTrapIndex(13.9, 14)).toBe(13)
    })

    it('handles single-tooth boundary without throwing', () => {
      expect(selectTrapIndex(() => 5, 1)).toBe(0)
      expect(clampTrapIndex(99, 1)).toBe(0)
    })

    it('falls back safely when RNG returns non-finite values', () => {
      expect(selectTrapIndex(() => Number.NaN, 14)).toBe(0)
      expect(selectTrapIndex(() => Number.POSITIVE_INFINITY, 14)).toBe(0)
      expect(clampTrapIndex(Number.NaN, 14)).toBe(0)
      expect(clampTrapIndex(Number.POSITIVE_INFINITY, 14)).toBe(13)
    })
  })

  describe('createInitialState', () => {
    it('creates playing state with configured tooth count and hidden trap', () => {
      const state = createInitialState(() => 0.25)

      expect(state.phase).toBe('playing')
      expect(state.toothCount).toBe(CROCODILE_CONFIG.toothCount)
      expect(state.pressedIndices).toEqual([])
      expect(state.trapIndex).toBe(3)
    })
  })

  describe('pressTooth', () => {
    it('ignores invalid tooth indices without mutating state', () => {
      const initial = createInitialState(() => 0)
      const invalidIndices = [-1, 12, 1.5, Number.NaN, Number.POSITIVE_INFINITY]

      for (const toothIndex of invalidIndices) {
        const result = pressTooth(initial, toothIndex)
        expect(result.outcome).toBe('ignored')
        expect(result.state).toEqual(initial)
      }
    })

    it('marks safe tooth as pressed once and keeps playing', () => {
      const initial = createInitialState(() => 0)
      const trapIndex = initial.trapIndex
      const safeIndex = trapIndex === 0 ? 1 : 0

      const { state, outcome } = pressTooth(initial, safeIndex)

      expect(outcome).toBe('safe')
      expect(state.phase).toBe('playing')
      expect(state.pressedIndices).toContain(safeIndex)
    })

    it('disables safe tooth after first press (repeat ignored)', () => {
      const initial = createInitialState(() => 0)
      const safeIndex = initial.trapIndex === 0 ? 1 : 0
      const first = pressTooth(initial, safeIndex)
      const second = pressTooth(first.state, safeIndex)

      expect(second.outcome).toBe('ignored')
      expect(second.state).toEqual(first.state)
    })

    it('transitions to bitten terminal when trap tooth is pressed', () => {
      const initial = createInitialState(() => 0.5)
      const trapIndex = initial.trapIndex

      const { state, outcome } = pressTooth(initial, trapIndex)

      expect(outcome).toBe('trap')
      expect(state.phase).toBe('bitten')
      expect(state.pressedIndices).toContain(trapIndex)
    })

    it('ignores all input after bitten terminal state', () => {
      const initial = createInitialState(() => 0.5)
      const bitten = pressTooth(initial, initial.trapIndex)
      const otherIndex = initial.trapIndex === 0 ? 1 : 0
      const after = pressTooth(bitten.state, otherIndex)

      expect(after.outcome).toBe('ignored')
      expect(after.state).toEqual(bitten.state)
    })

    it('ignores repeat press on trap tooth after bitten', () => {
      const initial = createInitialState(() => 0.5)
      const bitten = pressTooth(initial, initial.trapIndex)
      const again = pressTooth(bitten.state, initial.trapIndex)

      expect(again.outcome).toBe('ignored')
      expect(again.state).toEqual(bitten.state)
    })

    describe('forced outcomes', () => {
      it('makes the pressed tooth the trap when forced to lose', () => {
        const initial = { ...createInitialState(() => 0), trapIndex: 9 }
        const result = pressTooth(initial, 3, 'lose')

        expect(result.outcome).toBe('trap')
        expect(result.state.phase).toBe('bitten')
        expect(result.state.trapIndex).toBe(3)
        expect(result.state.pressedIndices).toEqual([3])
      })

      it('relocates the trap to an unpressed tooth when forced to win on it', () => {
        const initial = { ...createInitialState(() => 0), trapIndex: 0, pressedIndices: [5] }
        const result = pressTooth(initial, 0, 'win', () => 0)

        expect(result.outcome).toBe('safe')
        expect(result.state.phase).toBe('playing')
        expect(result.state.trapIndex).not.toBe(0)
        expect(result.state.pressedIndices).not.toContain(result.state.trapIndex)
      })

      it('leaves a safe tooth untouched when forced to win off the trap', () => {
        const initial = { ...createInitialState(() => 0), trapIndex: 7 }
        const result = pressTooth(initial, 2, 'win', () => 0)

        expect(result.outcome).toBe('safe')
        expect(result.state.trapIndex).toBe(7)
      })

      it('cannot rescue when every other tooth is already pressed', () => {
        const pressedIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        const initial = { ...createInitialState(() => 0), trapIndex: 0, pressedIndices }
        const result = pressTooth(initial, 0, 'win', () => 0)

        expect(result.outcome).toBe('trap')
        expect(result.state.phase).toBe('bitten')
      })

      it('does not consume the arm on an ignored press', () => {
        const initial = { ...createInitialState(() => 0), trapIndex: 4, pressedIndices: [2] }

        expect(pressTooth(initial, 2, 'lose').outcome).toBe('ignored')
        expect(pressTooth(initial, 99, 'lose').outcome).toBe('ignored')
        expect(pressTooth({ ...initial, phase: 'bitten' as const }, 5, 'lose').outcome).toBe(
          'ignored',
        )
      })

      it('behaves exactly as before when no outcome is forced', () => {
        const initial = { ...createInitialState(() => 0), trapIndex: 4 }

        expect(pressTooth(initial, 4)).toEqual(pressTooth(initial, 4, undefined))
        expect(pressTooth(initial, 1)).toEqual(pressTooth(initial, 1, undefined))
        expect(pressTooth(initial, 4).outcome).toBe('trap')
        expect(pressTooth(initial, 1).outcome).toBe('safe')
      })
    })
  })

  describe('resetGame', () => {
    it('creates a fresh round with a new trap and cleared presses', () => {
      const first = createInitialState(() => 0)
      const safeIndex = first.trapIndex === 0 ? 1 : 0
      pressTooth(first, safeIndex)

      const reset = resetGame(() => 0.99)

      expect(reset.phase).toBe('playing')
      expect(reset.pressedIndices).toEqual([])
      expect(reset.trapIndex).toBe(11)
      expect(reset.trapIndex).not.toBe(first.trapIndex)
    })
  })

  describe('helpers', () => {
    it('reports terminal only in bitten phase', () => {
      const playing = createInitialState(() => 0.1)
      expect(isTerminal(playing)).toBe(false)

      const bitten = pressTooth(playing, playing.trapIndex).state
      expect(isTerminal(bitten)).toBe(true)
    })

    it('disables pressed teeth and all teeth when terminal', () => {
      const initial = createInitialState(() => 0)
      const safeIndex = initial.trapIndex === 0 ? 1 : 0
      const afterSafe = pressTooth(initial, safeIndex).state

      expect(isToothDisabled(afterSafe, safeIndex)).toBe(true)
      expect(isToothDisabled(afterSafe, initial.trapIndex)).toBe(false)

      const bitten = pressTooth(initial, initial.trapIndex).state
      for (let index = 0; index < bitten.toothCount; index += 1) {
        expect(isToothDisabled(bitten, index)).toBe(true)
      }
    })
  })
})

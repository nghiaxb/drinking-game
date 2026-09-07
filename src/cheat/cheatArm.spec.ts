import { describe, it, expect, vi } from 'vitest'
import { createCheatArmSource } from './cheatArm'
import type { ArmedCheat } from './cheatTypes'

describe('createCheatArmSource', () => {
  it('returns nothing when no cheat is armed', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => null, consume)

    expect(source.takeForcedOutcome('crocodile')).toBeUndefined()
    expect(consume).not.toHaveBeenCalled()
  })

  it('returns nothing when the arm targets the other game', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => ({ game: 'mine', outcome: 'lose' }), consume)

    expect(source.takeForcedOutcome('crocodile')).toBeUndefined()
    expect(consume).not.toHaveBeenCalled()
  })

  it('hands over the outcome for a matching game without consuming it yet', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => ({ game: 'mine', outcome: 'win' }), consume)

    expect(source.takeForcedOutcome('mine')).toBe('win')
    expect(consume).not.toHaveBeenCalled()
  })

  it('consumes only when told the press actually landed', () => {
    let armed: ArmedCheat | null = { game: 'mine', outcome: 'lose' }
    const consume = vi.fn(() => {
      armed = null
    })
    const source = createCheatArmSource(() => armed, consume)

    source.takeForcedOutcome('mine')
    source.settle(true)

    expect(consume).toHaveBeenCalledTimes(1)
    expect(source.takeForcedOutcome('mine')).toBeUndefined()
  })

  it('keeps the arm when the press was ignored', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(() => ({ game: 'mine', outcome: 'lose' }), consume)

    source.takeForcedOutcome('mine')
    source.settle(false)

    expect(consume).not.toHaveBeenCalled()
  })
})

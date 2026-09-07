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
    const source = createCheatArmSource(
      () => ({ game: 'mine', outcome: 'lose', mode: 'once' }),
      consume,
    )

    expect(source.takeForcedOutcome('crocodile')).toBeUndefined()
    expect(consume).not.toHaveBeenCalled()
  })

  it('hands over the outcome for a matching game without consuming it yet', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(
      () => ({ game: 'mine', outcome: 'win', mode: 'once' }),
      consume,
    )

    expect(source.takeForcedOutcome('mine')).toBe('win')
    expect(consume).not.toHaveBeenCalled()
  })

  it('consumes only when told the press actually landed', () => {
    let armed: ArmedCheat | null = { game: 'mine', outcome: 'lose', mode: 'once' }
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
    const source = createCheatArmSource(
      () => ({ game: 'mine', outcome: 'lose', mode: 'once' }),
      consume,
    )

    source.takeForcedOutcome('mine')
    source.settle(false)

    expect(consume).not.toHaveBeenCalled()
  })
  it('never consumes a sticky arm, so every press keeps losing', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(
      () => ({ game: 'mine', outcome: 'lose', mode: 'sticky' }),
      consume,
    )

    for (let i = 0; i < 5; i += 1) {
      expect(source.takeForcedOutcome('mine')).toBe('lose')
      source.settle(true)
    }

    expect(consume).not.toHaveBeenCalled()
  })
  it('hands over a forced wheel segment and consumes a once arm', () => {
    let armed: ArmedCheat | null = { game: 'wheel', itemId: 'drink-100', mode: 'once' }
    const consume = vi.fn(() => {
      armed = null
    })
    const source = createCheatArmSource(() => armed, consume)

    expect(source.takeForcedItem()).toBe('drink-100')
    source.settle(true)

    expect(consume).toHaveBeenCalledTimes(1)
    expect(source.takeForcedItem()).toBeUndefined()
  })

  it('keeps a sticky wheel arm across spins', () => {
    const consume = vi.fn()
    const source = createCheatArmSource(
      () => ({ game: 'wheel', itemId: 'free', mode: 'sticky' }),
      consume,
    )

    for (let i = 0; i < 3; i += 1) {
      expect(source.takeForcedItem()).toBe('free')
      source.settle(true)
    }

    expect(consume).not.toHaveBeenCalled()
  })

  it('keeps the two cheat kinds apart', () => {
    const wheelSource = createCheatArmSource(
      () => ({ game: 'wheel', itemId: 'free', mode: 'once' }),
      vi.fn(),
    )
    expect(wheelSource.takeForcedOutcome('mine')).toBeUndefined()
    expect(wheelSource.takeForcedOutcome('crocodile')).toBeUndefined()

    const pressSource = createCheatArmSource(
      () => ({ game: 'mine', outcome: 'lose', mode: 'once' }),
      vi.fn(),
    )
    expect(pressSource.takeForcedItem()).toBeUndefined()
  })
})

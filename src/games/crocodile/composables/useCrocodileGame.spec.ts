import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCrocodileGame, type CrocodileFeedback } from './useCrocodileGame'

function createFeedback(): CrocodileFeedback & {
  playClick: ReturnType<typeof vi.fn>
  playChomp: ReturnType<typeof vi.fn>
  vibrateLight: ReturnType<typeof vi.fn>
  vibrateHeavy: ReturnType<typeof vi.fn>
} {
  return {
    playClick: vi.fn().mockResolvedValue(undefined),
    playChomp: vi.fn().mockResolvedValue(undefined),
    vibrateLight: vi.fn().mockResolvedValue(undefined),
    vibrateHeavy: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useCrocodileGame', () => {
  let rngValues: number[]
  let rngIndex: number

  beforeEach(() => {
    rngValues = [0.5, 0.1, 0.9]
    rngIndex = 0
  })

  function nextRng(): number {
    const value = rngValues[rngIndex] ?? 0.5
    rngIndex += 1
    return value
  }

  it('starts in playing phase with no pressed teeth', () => {
    const game = createCrocodileGame({ rng: nextRng, feedback: createFeedback() })

    expect(game.phase.value).toBe('playing')
    expect(game.pressedIndices.value).toEqual([])
    expect(game.isTerminal.value).toBe(false)
  })

  it('plays click and light haptic on safe tooth', async () => {
    const feedback = createFeedback()
    const game = createCrocodileGame({ rng: () => 0, feedback })

    const trapIndex = game.trapIndex.value
    const safeIndex = trapIndex === 0 ? 1 : 0
    await game.pressTooth(safeIndex)

    expect(feedback.playClick).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateLight).toHaveBeenCalledTimes(1)
    expect(feedback.playChomp).not.toHaveBeenCalled()
    expect(feedback.vibrateHeavy).not.toHaveBeenCalled()
    expect(game.pressedIndices.value).toContain(safeIndex)
  })

  it('plays chomp and heavy haptic on trap tooth', async () => {
    const feedback = createFeedback()
    const game = createCrocodileGame({ rng: () => 0.5, feedback })
    const trapIndex = game.trapIndex.value

    await game.pressTooth(trapIndex)

    expect(feedback.playChomp).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateHeavy).toHaveBeenCalledTimes(1)
    expect(feedback.playClick).not.toHaveBeenCalled()
    expect(game.phase.value).toBe('bitten')
    expect(game.isTerminal.value).toBe(true)
  })

  it('does not emit feedback when press is ignored', async () => {
    const feedback = createFeedback()
    const game = createCrocodileGame({ rng: () => 0, feedback })
    const safeIndex = game.trapIndex.value === 0 ? 1 : 0

    await game.pressTooth(safeIndex)
    await game.pressTooth(safeIndex)

    expect(feedback.playClick).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateLight).toHaveBeenCalledTimes(1)
  })

  it('reset starts a new round with new trap and cleared state', async () => {
    const feedback = createFeedback()
    const game = createCrocodileGame({ rng: nextRng, feedback })
    const firstTrap = game.trapIndex.value

    await game.pressTooth(firstTrap === 0 ? 1 : 0)
    game.reset()

    expect(game.phase.value).toBe('playing')
    expect(game.pressedIndices.value).toEqual([])
    expect(game.trapIndex.value).not.toBe(firstTrap)
  })

  it('handles concurrent double-tap on the same tooth only once', async () => {
    const feedback = createFeedback()
    const game = createCrocodileGame({ rng: () => 0, feedback })
    const safeIndex = game.trapIndex.value === 0 ? 1 : 0

    await Promise.all([game.pressTooth(safeIndex), game.pressTooth(safeIndex)])

    expect(game.pressedIndices.value.filter((index) => index === safeIndex)).toHaveLength(1)
    expect(feedback.playClick).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateLight).toHaveBeenCalledTimes(1)
  })
  it('bites the pressed tooth when the cheat source forces a loss', async () => {
    const game = createCrocodileGame({
      rng: () => 0,
      feedback: createFeedback(),
      cheat: { takeForcedOutcome: () => 'lose', settle: () => {} },
    })

    await game.pressTooth(5)

    expect(game.phase.value).toBe('bitten')
    expect(game.trapIndex.value).toBe(5)
  })

  it('does not consume the arm when the press is ignored', async () => {
    const settle = vi.fn()
    const game = createCrocodileGame({
      rng: () => 0,
      feedback: createFeedback(),
      cheat: { takeForcedOutcome: () => 'lose', settle },
    })

    await game.pressTooth(99)

    expect(settle).toHaveBeenCalledWith(false)
  })
})

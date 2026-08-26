import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMineGame, type MineFeedback } from './useMineGame'

function createFeedback(): MineFeedback & {
  playClick: ReturnType<typeof vi.fn>
  playExplosion: ReturnType<typeof vi.fn>
  vibrateLight: ReturnType<typeof vi.fn>
  vibrateHeavy: ReturnType<typeof vi.fn>
} {
  return {
    playClick: vi.fn().mockResolvedValue(undefined),
    playExplosion: vi.fn().mockResolvedValue(undefined),
    vibrateLight: vi.fn().mockResolvedValue(undefined),
    vibrateHeavy: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useMineGame', () => {
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

  it('starts in playing phase with no revealed cells', () => {
    const game = createMineGame({ rng: nextRng, feedback: createFeedback() })

    expect(game.phase.value).toBe('playing')
    expect(game.revealedIndices.value).toEqual([])
    expect(game.isTerminal.value).toBe(false)
  })

  it('plays click and light haptic on safe cell', async () => {
    const feedback = createFeedback()
    const game = createMineGame({ rng: () => 0, feedback })

    const mineSet = new Set(game.mineIndices.value)
    const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1
    await game.pressCell(safeIndex)

    expect(feedback.playClick).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateLight).toHaveBeenCalledTimes(1)
    expect(feedback.playExplosion).not.toHaveBeenCalled()
    expect(feedback.vibrateHeavy).not.toHaveBeenCalled()
    expect(game.revealedIndices.value).toContain(safeIndex)
  })

  it('plays explosion and heavy haptic on mine cell', async () => {
    const feedback = createFeedback()
    const game = createMineGame({ rng: () => 0.5, feedback })
    const mineIndex = game.mineIndices.value[0] ?? 0

    await game.pressCell(mineIndex)

    expect(feedback.playExplosion).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateHeavy).toHaveBeenCalledTimes(1)
    expect(feedback.playClick).not.toHaveBeenCalled()
    expect(game.phase.value).toBe('exploded')
    expect(game.isTerminal.value).toBe(true)
  })

  it('does not emit feedback when press is ignored', async () => {
    const feedback = createFeedback()
    const game = createMineGame({ rng: () => 0, feedback })
    const mineSet = new Set(game.mineIndices.value)
    const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1

    await game.pressCell(safeIndex)
    await game.pressCell(safeIndex)

    expect(feedback.playClick).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateLight).toHaveBeenCalledTimes(1)
  })

  it('reset starts a new round with new mines and cleared state', async () => {
    const feedback = createFeedback()
    const game = createMineGame({ rng: nextRng, feedback })
    const firstMines = [...game.mineIndices.value]

    const mineSet = new Set(firstMines)
    const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1
    await game.pressCell(safeIndex)
    game.reset()

    expect(game.phase.value).toBe('playing')
    expect(game.revealedIndices.value).toEqual([])
    expect(game.hitMineIndex.value).toBeNull()
  })

  it('handles concurrent double-tap on the same cell only once', async () => {
    const feedback = createFeedback()
    const game = createMineGame({ rng: () => 0, feedback })
    const mineSet = new Set(game.mineIndices.value)
    const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1

    await Promise.all([game.pressCell(safeIndex), game.pressCell(safeIndex)])

    expect(game.revealedIndices.value.filter((index) => index === safeIndex)).toHaveLength(1)
    expect(feedback.playClick).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateLight).toHaveBeenCalledTimes(1)
  })

  it('serializes concurrent mine-then-safe presses into terminal without safe feedback', async () => {
    const feedback = createFeedback()
    const game = createMineGame({ rng: () => 0.5, feedback })
    const mineIndex = game.mineIndices.value[0] ?? 0
    const mineSet = new Set(game.mineIndices.value)
    const safeIndex = Array.from({ length: 25 }, (_, i) => i).find((i) => !mineSet.has(i)) ?? 1

    await Promise.all([game.pressCell(mineIndex), game.pressCell(safeIndex)])

    expect(game.phase.value).toBe('exploded')
    expect(game.isTerminal.value).toBe(true)
    expect(feedback.playExplosion).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateHeavy).toHaveBeenCalledTimes(1)
    expect(feedback.playClick).not.toHaveBeenCalled()
    expect(feedback.vibrateLight).not.toHaveBeenCalled()
    expect(game.revealedIndices.value).toContain(mineIndex)
    expect(game.revealedIndices.value).not.toContain(safeIndex)
  })

  it('changes the mine count and keeps it across replays', () => {
    const game = createMineGame({ rng: nextRng, feedback: createFeedback() })

    expect(game.mineCount.value).toBe(1)

    game.setMineCount(3)
    expect(game.mineCount.value).toBe(3)
    expect(game.mineIndices.value).toHaveLength(3)
    expect(game.safeTotalCount.value).toBe(22)

    // Replay must not silently fall back to the configured default.
    game.reset()
    expect(game.mineCount.value).toBe(3)
    expect(game.mineIndices.value).toHaveLength(3)
  })

  it('clamps an out-of-range mine count instead of building an impossible board', () => {
    const game = createMineGame({ rng: nextRng, feedback: createFeedback() })

    game.setMineCount(99)
    expect(game.mineCount.value).toBe(3)

    game.setMineCount(0)
    expect(game.mineCount.value).toBe(1)
  })

  it('reports the risk of the next press and its rise as cells are cleared', async () => {
    const game = createMineGame({ rng: nextRng, feedback: createFeedback() })

    expect(game.nextRisk.value).toBeCloseTo(1 / 25)

    const safe = [...Array(25).keys()].find((index) => !game.mineIndices.value.includes(index))!
    await game.pressCell(safe)

    expect(game.safeRevealedCount.value).toBe(1)
    expect(game.nextRisk.value).toBeCloseTo(1 / 24)
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { CARDS_CONFIG } from '../config'
import { ALL_CARDS } from '../data'
import { createCardsGame } from './useCardsGame'

function createGame(overrides: Partial<Parameters<typeof createCardsGame>[0]> = {}) {
  return createCardsGame({
    allCards: ALL_CARDS,
    rng: () => 0,
    feedback: {
      playClick: vi.fn().mockResolvedValue(undefined),
      vibrateLight: vi.fn().mockResolvedValue(undefined),
    },
    prefersReducedMotion: ref(true),
    primeAudio: vi.fn(),
    ...overrides,
  })
}

describe('useCardsGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('draws a card and tracks remaining count', async () => {
    const game = createGame()
    expect(game.remaining.value).toBeGreaterThan(0)

    const drawn = await game.draw()
    expect(drawn).toBe(true)
    expect(game.currentCard.value).not.toBeNull()
    expect(game.remaining.value).toBe(game.totalInPool.value - 1)
    expect(game.cycleNumber.value).toBe(1)
    expect(game.isRevealed.value).toBe(true)
  })

  it('calls primeAudio exactly once per draw and never on reshuffle/deck', async () => {
    const primeAudio = vi.fn()
    const game = createGame({ primeAudio })

    await game.draw()
    expect(primeAudio).toHaveBeenCalledTimes(1)

    await game.draw()
    expect(primeAudio).toHaveBeenCalledTimes(2)

    primeAudio.mockClear()
    game.reshuffle()
    game.setDeck('dare')
    expect(primeAudio).not.toHaveBeenCalled()
  })

  it('sets current card before flip completes', async () => {
    vi.useFakeTimers()
    const game = createGame({ prefersReducedMotion: ref(false) })

    const drawPromise = game.draw()
    expect(game.currentCard.value).not.toBeNull()
    expect(game.isFlipped.value).toBe(false)
    expect(game.isRevealed.value).toBe(false)

    game.dispose()
    await drawPromise

    vi.useRealTimers()
  })

  it('rolls back engine state when flip is cancelled', async () => {
    vi.useFakeTimers()
    const game = createGame({ prefersReducedMotion: ref(false) })
    const remainingBefore = game.remaining.value
    const cycleBefore = game.cycleNumber.value

    const drawPromise = game.draw()
    game.dispose()

    expect(await drawPromise).toBe(false)
    expect(game.remaining.value).toBe(remainingBefore)
    expect(game.cycleNumber.value).toBe(cycleBefore)
    expect(game.currentCard.value).toBeNull()

    vi.useRealTimers()
  })

  it('plays click and light haptic without throwing', async () => {
    const playClick = vi.fn().mockResolvedValue(undefined)
    const vibrateLight = vi.fn().mockResolvedValue(undefined)
    const game = createGame({
      feedback: {
        playClick,
        vibrateLight,
      },
    })

    await expect(game.draw()).resolves.toBe(true)
    expect(playClick).toHaveBeenCalledTimes(1)
    expect(vibrateLight).toHaveBeenCalledTimes(1)
  })

  it('prevents rapid double draw while animating', async () => {
    vi.useFakeTimers()
    const game = createGame({ prefersReducedMotion: ref(false) })

    const first = game.draw()
    const second = await game.draw()
    expect(second).toBe(false)

    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.flipDurationMs + 16)
    await first

    vi.useRealTimers()
  })

  it('manual reshuffle resets remaining and bumps cycle', async () => {
    const game = createGame()
    await game.draw()
    const cycleBefore = game.cycleNumber.value
    const remainingAfterDraw = game.remaining.value

    game.reshuffle()
    expect(game.remaining.value).toBe(game.totalInPool.value)
    expect(game.remaining.value).toBeGreaterThan(remainingAfterDraw)
    expect(game.cycleNumber.value).toBe(cycleBefore + 1)
  })

  it('deck change rebuilds pool and bag', async () => {
    const game = createGame()
    await game.draw()
    game.setDeck('drinking')

    expect(game.deckType.value).toBe('drinking')
    expect(game.totalInPool.value).toBe(60)
    expect(game.remaining.value).toBe(60)
    expect(game.currentCard.value).toBeNull()
  })

  it('cleans up on dispose', async () => {
    vi.useFakeTimers()
    const game = createGame({ prefersReducedMotion: ref(false) })

    const drawPromise = game.draw()
    game.dispose()

    expect(await drawPromise).toBe(false)

    vi.useRealTimers()
  })
})

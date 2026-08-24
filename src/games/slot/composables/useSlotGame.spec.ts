import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createSlotGame } from './useSlotGame'

function createGame(overrides: Partial<Parameters<typeof createSlotGame>[0]> = {}) {
  return createSlotGame({
    rng: () => 0,
    feedback: {
      playSpin: vi.fn().mockResolvedValue(undefined),
      playWin: vi.fn().mockResolvedValue(undefined),
      playLose: vi.fn().mockResolvedValue(undefined),
      vibrateLight: vi.fn().mockResolvedValue(undefined),
      vibrateHeavy: vi.fn().mockResolvedValue(undefined),
    },
    prefersReducedMotion: ref(true),
    primeAudio: vi.fn(),
    ...overrides,
  })
}

describe('useSlotGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('selects final symbols in pending plan before animation completes', async () => {
    vi.useFakeTimers()
    const game = createGame()

    const spinPromise = game.spin()
    expect(game.pendingPlan.value?.symbols).toEqual(['beer', 'beer', 'beer'])
    expect(game.symbols.value).toBeNull()
    expect(game.phase.value).toBe('spinning')

    await vi.runAllTimersAsync()
    await spinPromise

    expect(game.phase.value).toBe('result')
    expect(game.symbols.value).toEqual(['beer', 'beer', 'beer'])
    expect(game.rewardLabel.value).toBe('Uống 3 ngụm')
    expect(game.isJackpot.value).toBe(true)

    vi.useRealTimers()
  })

  it('plays spin at start and win/heavy on jackpot completion', async () => {
    vi.useFakeTimers()
    const playSpin = vi.fn().mockResolvedValue(undefined)
    const playWin = vi.fn().mockResolvedValue(undefined)
    const vibrateHeavy = vi.fn().mockResolvedValue(undefined)
    const game = createGame({
      feedback: {
        playSpin,
        playWin,
        playLose: vi.fn().mockResolvedValue(undefined),
        vibrateLight: vi.fn().mockResolvedValue(undefined),
        vibrateHeavy,
      },
    })

    const spinPromise = game.spin()
    expect(playSpin).toHaveBeenCalledTimes(1)

    await vi.runAllTimersAsync()
    await spinPromise

    expect(playWin).toHaveBeenCalledTimes(1)
    expect(vibrateHeavy).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('plays lose feedback for non-triple results', async () => {
    vi.useFakeTimers()
    const playLose = vi.fn().mockResolvedValue(undefined)
    const rngValues = [0.22, 0, 0.5]
    const game = createGame({
      rng: () => rngValues.shift() ?? 0,
      feedback: {
        playSpin: vi.fn().mockResolvedValue(undefined),
        playWin: vi.fn().mockResolvedValue(undefined),
        playLose,
        vibrateLight: vi.fn().mockResolvedValue(undefined),
        vibrateHeavy: vi.fn().mockResolvedValue(undefined),
      },
    })

    const spinPromise = game.spin()
    await vi.runAllTimersAsync()
    await spinPromise

    expect(game.isJackpot.value).toBe(false)
    expect(playLose).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('blocks double spin while animation is running', async () => {
    vi.useFakeTimers()
    const game = createGame()

    const first = game.spin()
    const second = game.spin()

    expect(await second).toBe(false)

    await vi.runAllTimersAsync()
    expect(await first).toBe(true)

    vi.useRealTimers()
  })

  it('vibrates lightly on each reel stop', async () => {
    vi.useFakeTimers()
    const vibrateLight = vi.fn().mockResolvedValue(undefined)
    const game = createGame({
      feedback: {
        playSpin: vi.fn().mockResolvedValue(undefined),
        playWin: vi.fn().mockResolvedValue(undefined),
        playLose: vi.fn().mockResolvedValue(undefined),
        vibrateLight,
        vibrateHeavy: vi.fn().mockResolvedValue(undefined),
      },
    })

    const spinPromise = game.spin()
    await vi.runAllTimersAsync()
    await spinPromise

    expect(vibrateLight).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
  })

  it('cleans up pending spin on dispose and restores idle reel state', async () => {
    vi.useFakeTimers()
    const game = createGame()

    const spinPromise = game.spin()
    game.dispose()

    expect(await spinPromise).toBe(false)
    expect(game.phase.value).toBe('idle')
    expect(game.pendingPlan.value).toBeNull()
    expect(game.stoppedReels.value).toEqual([true, true, true])

    vi.useRealTimers()
  })

  it('calls primeAudio exactly once before RNG during spin', async () => {
    vi.useFakeTimers()
    const callOrder: string[] = []
    const primeAudio = vi.fn(() => {
      callOrder.push('prime')
    })
    const game = createGame({
      primeAudio,
      rng: () => {
        callOrder.push('rng')
        return 0
      },
    })

    const spinPromise = game.spin()
    expect(primeAudio).toHaveBeenCalledTimes(1)
    expect(callOrder).toEqual(['prime', 'rng', 'rng', 'rng', 'rng'])

    await vi.runAllTimersAsync()
    await spinPromise

    vi.useRealTimers()
  })

  it('resets to idle after dismissResult', async () => {
    vi.useFakeTimers()
    const game = createGame()

    const spinPromise = game.spin()
    await vi.runAllTimersAsync()
    await spinPromise

    game.dismissResult()
    expect(game.phase.value).toBe('idle')
    expect(game.rewardLabel.value).toBeNull()

    vi.useRealTimers()
  })
})

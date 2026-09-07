import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOMB_CONFIG, BOMB_FUSE_BOUNDS, DEFAULT_BOMB_FUSE_RANGE } from '../config'
import type { BombTopic } from '../types'
import { createBombGame } from './useBombGame'

function topic(id: string): BombTopic {
  return { id, category: 'party', text: `Kể tên ${id}` }
}

const TOPICS: BombTopic[] = [topic('a'), topic('b'), topic('c')]

function setup(rngValues: number[] = [0], stored: unknown = null) {
  const feedback = {
    playClick: vi.fn().mockResolvedValue(undefined),
    playTick: vi.fn().mockResolvedValue(undefined),
    playExplosion: vi.fn().mockResolvedValue(undefined),
    vibrateLight: vi.fn().mockResolvedValue(undefined),
    vibrateHeavy: vi.fn().mockResolvedValue(undefined),
  }
  const primeAudio = vi.fn()
  const storage = {
    get: vi.fn().mockResolvedValue(stored),
    set: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
    clearPrefix: vi.fn().mockResolvedValue(true),
    clearNamespace: vi.fn().mockResolvedValue(true),
  }

  let index = 0
  const rng = () => {
    const value = rngValues[index % rngValues.length] ?? 0
    index += 1
    return value
  }

  const game = createBombGame({ topics: TOPICS, rng, storage, feedback, primeAudio })
  return { game, feedback, primeAudio, storage }
}

describe('useBombGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts idle with the whole topic pool available', () => {
    const { game } = setup()

    expect(game.phase.value).toBe('idle')
    expect(game.currentTopic.value).toBeNull()
    expect(game.topicCount.value).toBe(TOPICS.length)
    expect(game.canReplay.value).toBe(false)
  })

  it('primes audio and reveals a topic on start', () => {
    const { game, feedback, primeAudio } = setup()

    expect(game.start()).toBe(true)
    expect(primeAudio).toHaveBeenCalledTimes(1)
    expect(game.phase.value).toBe('running')
    expect(game.currentTopic.value?.id).toBe('a')
    expect(feedback.playClick).toHaveBeenCalledTimes(1)
  })

  it('refuses to restart a round already in progress', () => {
    const { game } = setup()
    game.start()

    expect(game.start()).toBe(false)
  })

  it('counts passes and gives the holder feedback', () => {
    const { game, feedback } = setup()
    game.start()

    game.pass()
    game.pass()

    expect(game.passes.value).toBe(2)
    expect(feedback.vibrateLight).toHaveBeenCalledTimes(2)
  })

  it('ignores a pass once the bomb has gone off', () => {
    const { game } = setup()
    game.start()
    vi.advanceTimersByTime(DEFAULT_BOMB_FUSE_RANGE.maxMs)

    game.pass()
    expect(game.passes.value).toBe(0)
  })

  it('explodes with sound and a heavy buzz when the fuse ends', () => {
    const { game, feedback } = setup()
    game.start()

    vi.advanceTimersByTime(DEFAULT_BOMB_FUSE_RANGE.minMs)

    expect(game.phase.value).toBe('exploded')
    expect(feedback.playExplosion).toHaveBeenCalledTimes(1)
    expect(feedback.vibrateHeavy).toHaveBeenCalledTimes(1)
  })

  it('locks replay through the grace window so a mid-air tap cannot wipe the result', () => {
    const { game } = setup()
    game.start()
    vi.advanceTimersByTime(DEFAULT_BOMB_FUSE_RANGE.minMs)

    expect(game.canReplay.value).toBe(false)
    expect(game.start()).toBe(false)
    expect(game.phase.value).toBe('exploded')

    vi.advanceTimersByTime(BOMB_CONFIG.replayGraceMs)
    expect(game.canReplay.value).toBe(true)
  })

  it('starts a fresh round after the grace window, avoiding the last topic', () => {
    const { game } = setup()
    game.start()
    vi.advanceTimersByTime(DEFAULT_BOMB_FUSE_RANGE.minMs + BOMB_CONFIG.replayGraceMs)

    expect(game.start()).toBe(true)
    expect(game.phase.value).toBe('running')
    expect(game.passes.value).toBe(0)
    expect(game.currentTopic.value?.id).toBe('b')
  })

  it('starts on the default window and loads a stored one', async () => {
    const fresh = setup()
    expect(fresh.game.fuseRange.value).toEqual(DEFAULT_BOMB_FUSE_RANGE)

    const restored = setup([0], { minMs: 30_000, maxMs: 60_000 })
    await restored.game.load()
    expect(restored.game.fuseRange.value).toEqual({ minMs: 30_000, maxMs: 60_000 })
  })

  it('loads once even when called repeatedly', async () => {
    const { game, storage } = setup([0], { minMs: 20_000, maxMs: 45_000 })

    await Promise.all([game.load(), game.load(), game.load()])
    expect(storage.get).toHaveBeenCalledTimes(1)
  })

  it('keeps the default when nothing usable is stored', async () => {
    const { game } = setup([0], { minMs: 'nonsense' })
    await game.load()
    expect(game.fuseRange.value).toEqual(DEFAULT_BOMB_FUSE_RANGE)
  })

  it('moves the window with the sliders and only writes on save', async () => {
    const { game, storage } = setup()

    game.setMin(30_000)
    game.setMax(60_000)
    expect(game.fuseRange.value).toEqual({ minMs: 30_000, maxMs: 60_000 })
    expect(storage.set).not.toHaveBeenCalled()

    await game.saveFuseRange()
    expect(storage.set).toHaveBeenCalledTimes(1)
    expect(storage.set.mock.calls[0]?.[1]).toEqual({ minMs: 30_000, maxMs: 60_000 })
  })

  it('refuses to move the window while the fuse is burning', () => {
    const { game } = setup()
    game.start()

    game.setMin(BOMB_FUSE_BOUNDS.maxMs)
    expect(game.fuseRange.value).toEqual(DEFAULT_BOMB_FUSE_RANGE)
  })

  /* The drawn fuse has to come from the window the table actually set. */
  it('draws the fuse from the configured window', () => {
    const { game } = setup([0, 0])
    game.setMin(60_000)
    game.setMax(65_000)
    game.start()

    vi.advanceTimersByTime(59_999)
    expect(game.phase.value).toBe('running')

    vi.advanceTimersByTime(1)
    expect(game.phase.value).toBe('exploded')
  })

  /* A long window must still reach the fast ticks: the ramp follows the window's near end. */
  it('reaches the tick floor by the earliest blast on a long window', () => {
    const { game } = setup([0, 0.999])
    game.setMin(60_000)
    game.setMax(90_000)
    game.start()

    // Read just past the earliest blast: the ref holds the pace of the last tick that fired.
    vi.advanceTimersByTime(61_000)
    expect(game.phase.value).toBe('running')
    expect(game.tickIntervalMs.value).toBe(BOMB_CONFIG.tickFloorIntervalMs)
  })

  it('stops the fuse and clears the grace timer on dispose', () => {
    const { game, feedback } = setup()
    game.start()
    game.dispose()

    vi.advanceTimersByTime(DEFAULT_BOMB_FUSE_RANGE.maxMs * 2)

    expect(game.phase.value).toBe('running')
    expect(feedback.playExplosion).not.toHaveBeenCalled()
  })
})

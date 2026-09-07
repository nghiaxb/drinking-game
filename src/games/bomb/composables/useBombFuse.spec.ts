import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOMB_CONFIG, DEFAULT_BOMB_FUSE_RANGE } from '../config'
import { useBombFuse } from './useBombFuse'

const RAMP = DEFAULT_BOMB_FUSE_RANGE.minMs

function setup() {
  const playTick = vi.fn().mockResolvedValue(undefined)
  const onExplode = vi.fn()
  const fuse = useBombFuse({ playTick, onExplode })
  return { fuse, playTick, onExplode }
}

describe('useBombFuse', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('explodes exactly when the fuse runs out, not a tick later', () => {
    const { fuse, onExplode } = setup()
    fuse.start(1_000, RAMP)

    vi.advanceTimersByTime(999)
    expect(onExplode).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onExplode).toHaveBeenCalledTimes(1)
    expect(fuse.isBurning.value).toBe(false)
  })

  it('lands on time even when the fuse is shorter than one tick interval', () => {
    const { fuse, playTick, onExplode } = setup()
    fuse.start(100, RAMP)

    vi.advanceTimersByTime(100)
    expect(onExplode).toHaveBeenCalledTimes(1)
    // The clamped final wait ends in the blast, so there is no tick left to hear it in.
    expect(playTick).not.toHaveBeenCalled()
  })

  it('ticks faster as the round wears on', () => {
    const { fuse } = setup()
    fuse.start(DEFAULT_BOMB_FUSE_RANGE.maxMs, RAMP)

    expect(fuse.tickIntervalMs.value).toBe(BOMB_CONFIG.tickStartIntervalMs)

    vi.advanceTimersByTime(5_000)
    const midway = fuse.tickIntervalMs.value
    expect(midway).toBeLessThan(BOMB_CONFIG.tickStartIntervalMs)

    vi.advanceTimersByTime(15_000)
    expect(fuse.tickIntervalMs.value).toBeLessThanOrEqual(midway)
    expect(fuse.tickIntervalMs.value).toBeGreaterThanOrEqual(BOMB_CONFIG.tickFloorIntervalMs)
  })

  it('paces two identical rounds the same way regardless of fuse length', () => {
    const short = setup()
    short.fuse.start(DEFAULT_BOMB_FUSE_RANGE.minMs, RAMP)
    vi.advanceTimersByTime(5_000)
    const shortPace = short.fuse.tickIntervalMs.value

    vi.useRealTimers()
    vi.useFakeTimers()

    const long = setup()
    long.fuse.start(DEFAULT_BOMB_FUSE_RANGE.maxMs, RAMP)
    vi.advanceTimersByTime(5_000)

    // Anything else would let the table hear how close the bomb is.
    expect(long.fuse.tickIntervalMs.value).toBe(shortPace)
  })

  it('keeps ticking while the fuse burns', () => {
    const { fuse, playTick } = setup()
    fuse.start(10_000, RAMP)

    vi.advanceTimersByTime(3_000)
    expect(playTick.mock.calls.length).toBeGreaterThan(2)
  })

  it('stops without exploding when the round is abandoned', () => {
    const { fuse, onExplode, playTick } = setup()
    fuse.start(5_000, RAMP)

    vi.advanceTimersByTime(1_000)
    fuse.stop()
    const ticksAtStop = playTick.mock.calls.length

    vi.advanceTimersByTime(10_000)
    expect(onExplode).not.toHaveBeenCalled()
    expect(playTick.mock.calls.length).toBe(ticksAtStop)
    expect(fuse.isBurning.value).toBe(false)
  })

  it('drops the previous fuse when a new round starts', () => {
    const { fuse, onExplode } = setup()
    fuse.start(5_000, RAMP)
    vi.advanceTimersByTime(4_000)

    fuse.start(5_000, RAMP)
    vi.advanceTimersByTime(4_000)
    expect(onExplode).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1_000)
    expect(onExplode).toHaveBeenCalledTimes(1)
  })

  it('survives a tick sound that rejects', async () => {
    const playTick = vi.fn().mockRejectedValue(new Error('no audio'))
    const onExplode = vi.fn()
    const fuse = useBombFuse({ playTick, onExplode })

    fuse.start(3_000, RAMP)
    await vi.advanceTimersByTimeAsync(3_000)

    expect(onExplode).toHaveBeenCalledTimes(1)
  })

  it('clears its timer on dispose', () => {
    const { fuse, onExplode } = setup()
    fuse.start(2_000, RAMP)
    fuse.dispose()

    vi.advanceTimersByTime(5_000)
    expect(onExplode).not.toHaveBeenCalled()
  })
})

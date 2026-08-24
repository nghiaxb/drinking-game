import { describe, expect, it, vi } from 'vitest'
import { REEL_STOP_ORDER } from '../config'
import { useSlotAnimation } from './useSlotAnimation'

describe('useSlotAnimation', () => {
  it('initializes reels as idle-stopped semantic state', () => {
    const animation = useSlotAnimation({
      resolveTimings: () => ({
        baseSpinMs: 0,
        reelStopDelayMs: 0,
        cycleIntervalMs: 0,
      }),
      onReelStop: vi.fn(),
      onComplete: vi.fn(),
    })

    expect(animation.stoppedReels.value).toEqual([true, true, true])
    expect(animation.isAnimating.value).toBe(false)
  })

  it('stops reels left to center to right with staggered delays', async () => {
    vi.useFakeTimers()
    const stopOrder: number[] = []
    const delays: number[] = []
    const setTimeoutFn = vi.fn((callback: () => void, delay?: number) => {
      delays.push(delay ?? 0)
      return setTimeout(callback, delay)
    }) as unknown as typeof setTimeout

    const animation = useSlotAnimation({
      resolveTimings: () => ({
        baseSpinMs: 1000,
        reelStopDelayMs: 300,
        cycleIntervalMs: 50,
      }),
      onReelStop: (index) => {
        stopOrder.push(index)
      },
      onComplete: vi.fn(),
      setTimeoutFn,
      clearTimeoutFn: clearTimeout,
      setIntervalFn: vi.fn((_callback: TimerHandler, _interval?: number) => {
        return 0 as unknown as ReturnType<typeof setInterval>
      }) as unknown as typeof setInterval,
      clearIntervalFn: vi.fn(),
    })

    const spinPromise = animation.startSpin(['beer', 'skull', 'dice'])
    expect(animation.stoppedReels.value).toEqual([false, false, false])
    expect(animation.isAnimating.value).toBe(true)

    await vi.runAllTimersAsync()
    await spinPromise

    expect(stopOrder).toEqual([...REEL_STOP_ORDER])
    expect(delays).toEqual([1000, 1300, 1600])
    expect(animation.stoppedReels.value).toEqual([true, true, true])
    expect(animation.displaySymbols.value).toEqual(['beer', 'skull', 'dice'])

    vi.useRealTimers()
  })

  it('uses reduced-motion timings with short or zero delays', async () => {
    vi.useFakeTimers()
    const delays: number[] = []
    const setTimeoutFn = vi.fn((callback: () => void, delay?: number) => {
      delays.push(delay ?? 0)
      return setTimeout(callback, delay)
    }) as unknown as typeof setTimeout

    const animation = useSlotAnimation({
      resolveTimings: () => ({
        baseSpinMs: 0,
        reelStopDelayMs: 50,
        cycleIntervalMs: 0,
      }),
      onReelStop: vi.fn(),
      onComplete: vi.fn(),
      setTimeoutFn,
      clearTimeoutFn: clearTimeout,
    })

    const spinPromise = animation.startSpin(['clover', 'clover', 'clover'])
    await vi.runAllTimersAsync()
    await spinPromise

    expect(delays).toEqual([0, 50, 100])
    vi.useRealTimers()
  })

  it('fires light haptic callback on each reel stop', async () => {
    vi.useFakeTimers()
    const onReelStop = vi.fn()

    const animation = useSlotAnimation({
      resolveTimings: () => ({
        baseSpinMs: 0,
        reelStopDelayMs: 10,
        cycleIntervalMs: 0,
      }),
      onReelStop,
      onComplete: vi.fn(),
    })

    const spinPromise = animation.startSpin(['fire', 'fire', 'fire'])
    await vi.runAllTimersAsync()
    await spinPromise

    expect(onReelStop).toHaveBeenCalledTimes(3)
    expect(onReelStop).toHaveBeenNthCalledWith(1, 0)
    expect(onReelStop).toHaveBeenNthCalledWith(2, 1)
    expect(onReelStop).toHaveBeenNthCalledWith(3, 2)

    vi.useRealTimers()
  })

  it('rejects concurrent spins and resets idle reels on cancel', async () => {
    vi.useFakeTimers()

    const animation = useSlotAnimation({
      resolveTimings: () => ({
        baseSpinMs: 500,
        reelStopDelayMs: 200,
        cycleIntervalMs: 0,
      }),
      onReelStop: vi.fn(),
      onComplete: vi.fn(),
    })

    const first = animation.startSpin(['beer', 'beer', 'beer'])
    const second = animation.startSpin(['skull', 'skull', 'skull'])
    expect(await second).toBe(false)

    animation.dispose()
    expect(await first).toBe(false)
    expect(animation.isAnimating.value).toBe(false)
    expect(animation.stoppedReels.value).toEqual([true, true, true])

    vi.useRealTimers()
  })

  it('resolves spin when callbacks throw and clears timers', async () => {
    vi.useFakeTimers()
    const onReelStop = vi.fn(() => {
      throw new Error('haptic failed')
    })
    const onComplete = vi.fn(() => {
      throw new Error('complete failed')
    })

    const animation = useSlotAnimation({
      resolveTimings: () => ({
        baseSpinMs: 0,
        reelStopDelayMs: 0,
        cycleIntervalMs: 0,
      }),
      onReelStop,
      onComplete,
    })

    const spinPromise = animation.startSpin(['beer', 'skull', 'dice'])
    await vi.runAllTimersAsync()

    await expect(spinPromise).resolves.toBe(true)
    expect(onReelStop).toHaveBeenCalledTimes(3)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(animation.isAnimating.value).toBe(false)

    vi.useRealTimers()
  })
})

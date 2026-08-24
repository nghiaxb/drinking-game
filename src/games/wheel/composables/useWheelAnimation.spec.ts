import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { WHEEL_CONFIG } from '../config'
import { useWheelAnimation } from './useWheelAnimation'

describe('useWheelAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves true after duration and applies target rotation immediately', async () => {
    const onComplete = vi.fn()
    const playTick = vi.fn().mockResolvedValue(undefined)
    const rotation = ref(0)

    const animation = useWheelAnimation({
      rotation,
      resolveDurationMs: () => WHEEL_CONFIG.spinDurationMs,
      tickIntervalMs: WHEEL_CONFIG.tickIntervalMs,
      playTick,
      onComplete,
    })

    const spinPromise = animation.startSpin({ targetRotation: 720 })
    expect(animation.isSpinning.value).toBe(true)
    expect(rotation.value).toBe(720)

    await vi.advanceTimersByTimeAsync(WHEEL_CONFIG.spinDurationMs)
    await expect(spinPromise).resolves.toBe(true)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(animation.isSpinning.value).toBe(false)
  })

  it('completes immediately without ticks when duration is 0', async () => {
    const onComplete = vi.fn()
    const playTick = vi.fn().mockResolvedValue(undefined)
    const rotation = ref(0)

    const animation = useWheelAnimation({
      rotation,
      resolveDurationMs: () => WHEEL_CONFIG.spinDurationReducedMs,
      tickIntervalMs: WHEEL_CONFIG.tickIntervalMs,
      playTick,
      onComplete,
    })

    const spinPromise = animation.startSpin({ targetRotation: 360 })
    await vi.advanceTimersByTimeAsync(0)
    await expect(spinPromise).resolves.toBe(true)

    expect(playTick).not.toHaveBeenCalled()
    expect(rotation.value).toBe(360)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('plays tick sounds during spin and swallows tick rejections', async () => {
    const onComplete = vi.fn()
    const playTick = vi.fn().mockRejectedValue(new Error('audio blocked'))
    const rotation = ref(0)

    const animation = useWheelAnimation({
      rotation,
      resolveDurationMs: () => 400,
      tickIntervalMs: 100,
      playTick,
      onComplete,
    })

    const spinPromise = animation.startSpin({ targetRotation: 500 })
    await vi.advanceTimersByTimeAsync(250)
    expect(playTick.mock.calls.length).toBeGreaterThanOrEqual(2)

    await vi.advanceTimersByTimeAsync(400)
    await expect(spinPromise).resolves.toBe(true)
  })

  it('prevents double spin and resolves false on cancel', async () => {
    const onComplete = vi.fn()
    const playTick = vi.fn().mockResolvedValue(undefined)
    const rotation = ref(0)

    const animation = useWheelAnimation({
      rotation,
      resolveDurationMs: () => WHEEL_CONFIG.spinDurationMs,
      tickIntervalMs: 100,
      playTick,
      onComplete,
    })

    const first = animation.startSpin({ targetRotation: 400 })
    await expect(animation.startSpin({ targetRotation: 800 })).resolves.toBe(false)

    animation.cancel()
    await expect(first).resolves.toBe(false)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('resolves false on dispose without completing', async () => {
    const onComplete = vi.fn()
    const playTick = vi.fn().mockResolvedValue(undefined)
    const rotation = ref(0)

    const animation = useWheelAnimation({
      rotation,
      resolveDurationMs: () => WHEEL_CONFIG.spinDurationMs,
      tickIntervalMs: 100,
      playTick,
      onComplete,
    })

    const spinPromise = animation.startSpin({ targetRotation: 600 })
    animation.dispose()

    await expect(spinPromise).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(WHEEL_CONFIG.spinDurationMs + 500)
    expect(onComplete).not.toHaveBeenCalled()
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CARDS_CONFIG } from '../config'
import { useCardsAnimation } from './useCardsAnimation'

describe('useCardsAnimation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reveals instantly when reduced motion duration is 0', async () => {
    const onRevealed = vi.fn()
    const animation = useCardsAnimation({
      resolveDurationMs: () => 0,
      onRevealed,
    })

    expect(animation.isAnimating.value).toBe(false)
    const completed = await animation.startFlip()

    expect(completed).toBe(true)
    expect(animation.phase.value).toBe('revealed')
    expect(animation.isFlipped.value).toBe(true)
    expect(animation.isRevealed.value).toBe(true)
    expect(animation.isAnimating.value).toBe(false)
    expect(onRevealed).toHaveBeenCalledTimes(1)
  })

  it('locks synchronously, flips on rAF, and completes after exact duration', async () => {
    vi.useFakeTimers()
    const rafCallbacks: FrameRequestCallback[] = []
    const onRevealed = vi.fn()
    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      onRevealed,
      requestAnimationFrameFn: (callback) => {
        rafCallbacks.push(callback)
        return rafCallbacks.length
      },
      cancelAnimationFrameFn: vi.fn(),
      setTimeoutFn: vi.fn((callback: () => void, delay?: number) =>
        setTimeout(callback, delay),
      ) as unknown as typeof setTimeout,
      clearTimeoutFn: clearTimeout,
    })

    const flipPromise = animation.startFlip()
    expect(animation.isAnimating.value).toBe(true)
    expect(animation.phase.value).toBe('flipping')
    expect(animation.isFlipped.value).toBe(false)
    expect(onRevealed).not.toHaveBeenCalled()

    rafCallbacks.shift()?.(0)
    expect(animation.isFlipped.value).toBe(true)
    expect(animation.isAnimating.value).toBe(true)

    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.flipDurationMs)
    expect(await flipPromise).toBe(true)
    expect(animation.phase.value).toBe('revealed')
    expect(animation.isRevealed.value).toBe(true)
    expect(animation.isAnimating.value).toBe(false)
    expect(onRevealed).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('cancels rAF and timer on dispose resolving false', async () => {
    vi.useFakeTimers()
    const cancelAnimationFrameFn = vi.fn()
    const clearTimeoutFn = vi.fn(clearTimeout)
    const rafCallbacks: FrameRequestCallback[] = []
    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      onRevealed: vi.fn(),
      requestAnimationFrameFn: (callback) => {
        rafCallbacks.push(callback)
        return 7
      },
      cancelAnimationFrameFn,
      setTimeoutFn: vi.fn((callback: () => void, delay?: number) =>
        setTimeout(callback, delay),
      ) as unknown as typeof setTimeout,
      clearTimeoutFn,
    })

    const flipPromise = animation.startFlip()
    animation.dispose()

    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(7)
    expect(clearTimeoutFn).toHaveBeenCalled()
    expect(await flipPromise).toBe(false)
    expect(animation.phase.value).toBe('idle')
    expect(animation.isRevealed.value).toBe(false)

    vi.useRealTimers()
  })

  it('blocks concurrent flips', async () => {
    vi.useFakeTimers()
    const animation = useCardsAnimation({
      resolveDurationMs: () => 200,
      onRevealed: vi.fn(),
    })

    const first = animation.startFlip()
    const second = await animation.startFlip()
    expect(second).toBe(false)

    await vi.runAllTimersAsync()
    await first

    vi.useRealTimers()
  })

  it('resets to back face', async () => {
    const animation = useCardsAnimation({
      resolveDurationMs: () => 0,
    })

    await animation.startFlip()
    animation.resetToBack()
    expect(animation.isFlipped.value).toBe(false)
    expect(animation.isRevealed.value).toBe(false)
    expect(animation.phase.value).toBe('idle')
  })

  it('uses injected request and cancel as a matched pair', async () => {
    vi.useFakeTimers()
    const cancelAnimationFrameFn = vi.fn()
    const rafCallbacks: FrameRequestCallback[] = []
    const requestAnimationFrameFn = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback)
      return 11
    })
    const clearTimeoutFn = vi.fn()
    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      requestAnimationFrameFn,
      cancelAnimationFrameFn,
      setTimeoutFn: vi.fn((callback: () => void, delay?: number) =>
        setTimeout(callback, delay),
      ) as unknown as typeof setTimeout,
      clearTimeoutFn,
    })

    const flipPromise = animation.startFlip()
    animation.cancel()

    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(11)
    expect(clearTimeoutFn).toHaveBeenCalled()
    expect(await flipPromise).toBe(false)
    expect(animation.isRevealed.value).toBe(false)

    vi.useRealTimers()
  })

  it('falls back to timeout scheduling when rAF request is absent but cancel is injected', async () => {
    vi.useFakeTimers()
    const clearTimeoutFn = vi.fn()
    const setTimeoutFn = vi.fn((callback: () => void, delay?: number) =>
      setTimeout(callback, delay ?? 0),
    ) as unknown as typeof setTimeout
    const cancelAnimationFrameFn = vi.fn()
    const onRevealed = vi.fn()

    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    // @ts-expect-error simulate rAF-absent environment
    delete globalThis.requestAnimationFrame
    // @ts-expect-error simulate rAF-absent environment
    delete globalThis.cancelAnimationFrame

    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      onRevealed,
      cancelAnimationFrameFn,
      setTimeoutFn,
      clearTimeoutFn,
    })

    const flipPromise = animation.startFlip()
    expect(cancelAnimationFrameFn).not.toHaveBeenCalled()
    expect(setTimeoutFn).toHaveBeenCalled()

    animation.cancel()

    expect(clearTimeoutFn).toHaveBeenCalled()
    expect(cancelAnimationFrameFn).not.toHaveBeenCalled()
    expect(await flipPromise).toBe(false)
    expect(animation.isRevealed.value).toBe(false)
    expect(onRevealed).not.toHaveBeenCalled()

    globalThis.requestAnimationFrame = originalRequestAnimationFrame
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame
    vi.useRealTimers()
  })

  it('completes without onRevealed callback', async () => {
    const animation = useCardsAnimation({
      resolveDurationMs: () => 0,
    })

    await expect(animation.startFlip()).resolves.toBe(true)
    expect(animation.isRevealed.value).toBe(true)
  })

  it('starts flip via frame fallback when rAF never fires', async () => {
    vi.useFakeTimers()
    const rafCallbacks: FrameRequestCallback[] = []
    const onRevealed = vi.fn()
    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      onRevealed,
      requestAnimationFrameFn: (callback) => {
        rafCallbacks.push(callback)
        return 1
      },
      cancelAnimationFrameFn: vi.fn(),
      setTimeoutFn: vi.fn((callback: () => void, delay?: number) =>
        setTimeout(callback, delay),
      ) as unknown as typeof setTimeout,
      clearTimeoutFn: clearTimeout,
    })

    const flipPromise = animation.startFlip()
    expect(animation.isFlipped.value).toBe(false)
    expect(rafCallbacks).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.frameFallbackMs)
    expect(animation.isFlipped.value).toBe(true)

    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.flipDurationMs)
    expect(await flipPromise).toBe(true)
    expect(onRevealed).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('clears frame fallback when rAF fires first without duplicate flip', async () => {
    vi.useFakeTimers()
    const rafCallbacks: FrameRequestCallback[] = []
    const clearTimeoutFn = vi.fn(clearTimeout)
    const onRevealed = vi.fn()
    const setTimeoutFn = vi.fn((callback: () => void, delay?: number) =>
      setTimeout(callback, delay),
    ) as unknown as typeof setTimeout

    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      onRevealed,
      requestAnimationFrameFn: (callback) => {
        rafCallbacks.push(callback)
        return 1
      },
      cancelAnimationFrameFn: vi.fn(),
      setTimeoutFn,
      clearTimeoutFn,
    })

    const flipPromise = animation.startFlip()
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), CARDS_CONFIG.frameFallbackMs)

    rafCallbacks.shift()?.(0)
    expect(animation.isFlipped.value).toBe(true)
    expect(clearTimeoutFn).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.frameFallbackMs)
    expect(onRevealed).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.flipDurationMs)
    await flipPromise
    expect(onRevealed).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('cancels both rAF and frame fallback before either fires', async () => {
    vi.useFakeTimers()
    const cancelAnimationFrameFn = vi.fn()
    const clearTimeoutFn = vi.fn(clearTimeout)
    const rafCallbacks: FrameRequestCallback[] = []
    const onRevealed = vi.fn()

    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      onRevealed,
      requestAnimationFrameFn: (callback) => {
        rafCallbacks.push(callback)
        return 9
      },
      cancelAnimationFrameFn,
      setTimeoutFn: vi.fn((callback: () => void, delay?: number) =>
        setTimeout(callback, delay),
      ) as unknown as typeof setTimeout,
      clearTimeoutFn,
    })

    const flipPromise = animation.startFlip()
    animation.cancel()

    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(9)
    expect(clearTimeoutFn).toHaveBeenCalled()
    expect(await flipPromise).toBe(false)
    expect(animation.isFlipped.value).toBe(false)
    expect(onRevealed).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.frameFallbackMs + CARDS_CONFIG.flipDurationMs)
    expect(onRevealed).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('completes within frame fallback plus flip duration when rAF stalls', async () => {
    vi.useFakeTimers()
    const animation = useCardsAnimation({
      resolveDurationMs: () => CARDS_CONFIG.flipDurationMs,
      requestAnimationFrameFn: (callback) => {
        void callback
        return 1
      },
      cancelAnimationFrameFn: vi.fn(),
    })

    const flipPromise = animation.startFlip()
    await vi.advanceTimersByTimeAsync(CARDS_CONFIG.frameFallbackMs + CARDS_CONFIG.flipDurationMs)
    expect(await flipPromise).toBe(true)

    vi.useRealTimers()
  })
})

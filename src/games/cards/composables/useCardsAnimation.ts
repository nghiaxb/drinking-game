import { ref, type Ref } from 'vue'
import { CARDS_CONFIG } from '../config'
import type { CardsPhase } from '../types'

export interface CardsAnimationOptions {
  resolveDurationMs: () => number
  onRevealed?: () => void
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
  requestAnimationFrameFn?: (callback: FrameRequestCallback) => number
  cancelAnimationFrameFn?: (handle: number) => void
}

export interface CardsAnimationController {
  phase: Ref<CardsPhase>
  isAnimating: Ref<boolean>
  isFlipped: Ref<boolean>
  isRevealed: Ref<boolean>
  startFlip: () => Promise<boolean>
  resetToBack: () => void
  cancel: () => void
  dispose: () => void
}

interface FrameSchedule {
  cancel: () => void
}

interface FrameScheduler {
  schedule: (callback: FrameRequestCallback) => FrameSchedule
}

function safeOnRevealed(callback: () => void): void {
  try {
    callback()
  } catch {
    // Reveal callback failure — safe no-op.
  }
}

function createRafWithFallbackScheduler(
  requestFrame: (callback: FrameRequestCallback) => number,
  cancelFrame: (handle: number) => void,
  setTimeoutFn: typeof setTimeout,
  clearTimeoutFn: typeof clearTimeout,
  frameFallbackMs: number,
): FrameScheduler {
  return {
    schedule(callback) {
      let invoked = false
      let rafHandle: number | null = null
      let fallbackHandle: ReturnType<typeof setTimeout> | null = null

      const cancelBoth = (): void => {
        if (rafHandle !== null) {
          cancelFrame(rafHandle)
          rafHandle = null
        }
        if (fallbackHandle !== null) {
          clearTimeoutFn(fallbackHandle)
          fallbackHandle = null
        }
      }

      const invokeOnce = (timestamp: number): void => {
        if (invoked) {
          return
        }
        invoked = true
        cancelBoth()
        callback(timestamp)
      }

      rafHandle = requestFrame(invokeOnce)
      fallbackHandle = setTimeoutFn(() => invokeOnce(0), frameFallbackMs)

      return { cancel: cancelBoth }
    },
  }
}

function createTimeoutOnlyScheduler(
  setTimeoutFn: typeof setTimeout,
  clearTimeoutFn: typeof clearTimeout,
): FrameScheduler {
  return {
    schedule(callback) {
      const handle = setTimeoutFn(() => callback(0), 0)
      return {
        cancel: () => {
          clearTimeoutFn(handle)
        },
      }
    },
  }
}

function createFrameScheduler(
  options: Pick<
    CardsAnimationOptions,
    'setTimeoutFn' | 'clearTimeoutFn' | 'requestAnimationFrameFn' | 'cancelAnimationFrameFn'
  >,
  setTimeoutFn: typeof setTimeout,
  clearTimeoutFn: typeof clearTimeout,
): FrameScheduler {
  if (options.requestAnimationFrameFn && options.cancelAnimationFrameFn) {
    return createRafWithFallbackScheduler(
      options.requestAnimationFrameFn,
      options.cancelAnimationFrameFn,
      setTimeoutFn,
      clearTimeoutFn,
      CARDS_CONFIG.frameFallbackMs,
    )
  }

  if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
    return createRafWithFallbackScheduler(
      requestAnimationFrame,
      cancelAnimationFrame,
      setTimeoutFn,
      clearTimeoutFn,
      CARDS_CONFIG.frameFallbackMs,
    )
  }

  return createTimeoutOnlyScheduler(setTimeoutFn, clearTimeoutFn)
}

export function useCardsAnimation(options: CardsAnimationOptions): CardsAnimationController {
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout
  const frameScheduler = createFrameScheduler(options, setTimeoutFn, clearTimeoutFn)

  const phase = ref<CardsPhase>('idle')
  const isAnimating = ref(false)
  const isFlipped = ref(false)
  const isRevealed = ref(false)
  let flipTimer: ReturnType<typeof setTimeoutFn> | null = null
  let flipFrameSchedule: FrameSchedule | null = null
  let resolveFlip: ((completed: boolean) => void) | null = null

  function clearScheduled(): void {
    if (flipTimer !== null) {
      clearTimeoutFn(flipTimer)
      flipTimer = null
    }
    if (flipFrameSchedule !== null) {
      flipFrameSchedule.cancel()
      flipFrameSchedule = null
    }
  }

  function finishFlip(completed: boolean): void {
    clearScheduled()
    isAnimating.value = false
    if (completed) {
      phase.value = 'revealed'
      isFlipped.value = true
      isRevealed.value = true
      if (options.onRevealed) {
        safeOnRevealed(options.onRevealed)
      }
    } else {
      phase.value = 'idle'
      isFlipped.value = false
      isRevealed.value = false
    }
    if (resolveFlip) {
      resolveFlip(completed)
      resolveFlip = null
    }
  }

  function cancel(): void {
    if (!isAnimating.value) {
      return
    }
    finishFlip(false)
  }

  function dispose(): void {
    cancel()
  }

  function resetToBack(): void {
    clearScheduled()
    phase.value = 'idle'
    isAnimating.value = false
    isFlipped.value = false
    isRevealed.value = false
    if (resolveFlip) {
      resolveFlip(false)
      resolveFlip = null
    }
  }

  function startFlip(): Promise<boolean> {
    if (isAnimating.value) {
      return Promise.resolve(false)
    }

    clearScheduled()
    isAnimating.value = true
    phase.value = 'flipping'
    isFlipped.value = false
    isRevealed.value = false

    const durationMs = options.resolveDurationMs()
    if (durationMs <= 0) {
      finishFlip(true)
      return Promise.resolve(true)
    }

    return new Promise<boolean>((resolve) => {
      resolveFlip = resolve

      flipFrameSchedule = frameScheduler.schedule(() => {
        flipFrameSchedule = null
        isFlipped.value = true

        flipTimer = setTimeoutFn(() => {
          flipTimer = null
          finishFlip(true)
        }, durationMs)
      })
    })
  }

  return {
    phase,
    isAnimating,
    isFlipped,
    isRevealed,
    startFlip,
    resetToBack,
    cancel,
    dispose,
  }
}

import { ref, type Ref } from 'vue'
import { REEL_STOP_ORDER } from '../config'
import { SLOT_SYMBOL_ORDER } from '../symbols'
import type { SlotSymbolId } from '../types'

export interface SlotAnimationTimings {
  baseSpinMs: number
  reelStopDelayMs: number
  cycleIntervalMs: number
}

export interface SlotAnimationOptions {
  resolveTimings: () => SlotAnimationTimings
  onReelStop: (reelIndex: number) => void
  onComplete: () => void
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
  setIntervalFn?: typeof setInterval
  clearIntervalFn?: typeof clearInterval
}

export interface SlotAnimationController {
  displaySymbols: Ref<[SlotSymbolId, SlotSymbolId, SlotSymbolId]>
  stoppedReels: Ref<[boolean, boolean, boolean]>
  isAnimating: Ref<boolean>
  startSpin: (finalSymbols: [SlotSymbolId, SlotSymbolId, SlotSymbolId]) => Promise<boolean>
  cancel: () => void
  dispose: () => void
}

const IDLE_STOPPED_REELS: [boolean, boolean, boolean] = [true, true, true]

function nextCycleSymbol(current: SlotSymbolId): SlotSymbolId {
  const index = SLOT_SYMBOL_ORDER.indexOf(current)
  const nextIndex = index >= 0 ? (index + 1) % SLOT_SYMBOL_ORDER.length : 0
  return SLOT_SYMBOL_ORDER[nextIndex] ?? SLOT_SYMBOL_ORDER[0]
}

function safeOnReelStop(callback: (reelIndex: number) => void, reelIndex: number): void {
  try {
    callback(reelIndex)
  } catch {
    // Reel stop callback failure — safe no-op.
  }
}

function safeOnComplete(callback: () => void): void {
  try {
    callback()
  } catch {
    // Complete callback failure — safe no-op.
  }
}

export function useSlotAnimation(options: SlotAnimationOptions): SlotAnimationController {
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout
  const setIntervalFn = options.setIntervalFn ?? setInterval
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval

  const displaySymbols = ref<[SlotSymbolId, SlotSymbolId, SlotSymbolId]>([
    SLOT_SYMBOL_ORDER[0],
    SLOT_SYMBOL_ORDER[0],
    SLOT_SYMBOL_ORDER[0],
  ])
  const stoppedReels = ref<[boolean, boolean, boolean]>([...IDLE_STOPPED_REELS])
  const isAnimating = ref(false)

  const stopTimers: Array<ReturnType<typeof setTimeout> | null> = [null, null, null]
  let cycleTimer: ReturnType<typeof setInterval> | null = null
  let resolveSpin: ((completed: boolean) => void) | null = null

  function clearTimers(): void {
    if (cycleTimer !== null) {
      clearIntervalFn(cycleTimer)
      cycleTimer = null
    }
    for (let index = 0; index < stopTimers.length; index += 1) {
      const timer = stopTimers[index]
      if (timer !== null) {
        clearTimeoutFn(timer)
        stopTimers[index] = null
      }
    }
  }

  function resetToIdleReels(): void {
    stoppedReels.value = [...IDLE_STOPPED_REELS]
  }

  function finishSpin(completed: boolean): void {
    clearTimers()
    isAnimating.value = false
    if (!completed) {
      resetToIdleReels()
    }
    if (resolveSpin) {
      resolveSpin(completed)
      resolveSpin = null
    }
  }

  function cancel(): void {
    if (!isAnimating.value) {
      return
    }
    finishSpin(false)
  }

  function dispose(): void {
    cancel()
  }

  function startSpin(finalSymbols: [SlotSymbolId, SlotSymbolId, SlotSymbolId]): Promise<boolean> {
    if (isAnimating.value) {
      return Promise.resolve(false)
    }

    clearTimers()
    isAnimating.value = true
    stoppedReels.value = [false, false, false]
    displaySymbols.value = [
      SLOT_SYMBOL_ORDER[0],
      SLOT_SYMBOL_ORDER[1] ?? SLOT_SYMBOL_ORDER[0],
      SLOT_SYMBOL_ORDER[2] ?? SLOT_SYMBOL_ORDER[0],
    ]

    const timings = options.resolveTimings()

    if (timings.cycleIntervalMs > 0) {
      cycleTimer = setIntervalFn(() => {
        const next = [...displaySymbols.value] as [SlotSymbolId, SlotSymbolId, SlotSymbolId]
        for (const reelIndex of REEL_STOP_ORDER) {
          if (!stoppedReels.value[reelIndex]) {
            next[reelIndex] = nextCycleSymbol(next[reelIndex])
          }
        }
        displaySymbols.value = next
      }, timings.cycleIntervalMs)
    }

    return new Promise<boolean>((resolve) => {
      resolveSpin = resolve

      for (const reelIndex of REEL_STOP_ORDER) {
        const delay = timings.baseSpinMs + reelIndex * timings.reelStopDelayMs
        stopTimers[reelIndex] = setTimeoutFn(() => {
          const next = [...displaySymbols.value] as [SlotSymbolId, SlotSymbolId, SlotSymbolId]
          next[reelIndex] = finalSymbols[reelIndex]
          displaySymbols.value = next

          const nextStopped = [...stoppedReels.value] as [boolean, boolean, boolean]
          nextStopped[reelIndex] = true
          stoppedReels.value = nextStopped

          safeOnReelStop(options.onReelStop, reelIndex)

          if (reelIndex === REEL_STOP_ORDER[REEL_STOP_ORDER.length - 1]) {
            safeOnComplete(options.onComplete)
            finishSpin(true)
          }
        }, delay)
      }
    })
  }

  return {
    displaySymbols,
    stoppedReels,
    isAnimating,
    startSpin,
    cancel,
    dispose,
  }
}

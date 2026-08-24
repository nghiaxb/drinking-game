import { ref, type Ref } from 'vue'

export interface WheelAnimationOptions {
  rotation: Ref<number>
  resolveDurationMs: () => number
  tickIntervalMs: number
  playTick: () => Promise<void>
  onComplete: () => void
}

export interface WheelAnimationController {
  isSpinning: Ref<boolean>
  startSpin: (input: { targetRotation: number }) => Promise<boolean>
  cancel: () => void
  dispose: () => void
}

export function useWheelAnimation(options: WheelAnimationOptions): WheelAnimationController {
  const isSpinning = ref(false)
  let spinTimer: ReturnType<typeof setTimeout> | null = null
  let tickTimer: ReturnType<typeof setInterval> | null = null
  let resolveSpin: ((completed: boolean) => void) | null = null

  function clearTimers(): void {
    if (spinTimer !== null) {
      clearTimeout(spinTimer)
      spinTimer = null
    }
    if (tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }

  function finishSpin(completed: boolean, invokeComplete: boolean): void {
    clearTimers()
    isSpinning.value = false
    if (invokeComplete) {
      options.onComplete()
    }
    if (resolveSpin) {
      resolveSpin(completed)
      resolveSpin = null
    }
  }

  function cancel(): void {
    if (!isSpinning.value) {
      return
    }
    finishSpin(false, false)
  }

  function dispose(): void {
    cancel()
  }

  function startSpin(input: { targetRotation: number }): Promise<boolean> {
    if (isSpinning.value) {
      return Promise.resolve(false)
    }

    clearTimers()
    isSpinning.value = true
    options.rotation.value = input.targetRotation

    const duration = options.resolveDurationMs()

    if (duration > 0) {
      tickTimer = setInterval(() => {
        void Promise.resolve(options.playTick()).catch(() => {
          // Tick sound failure — safe no-op.
        })
      }, options.tickIntervalMs)
    }

    return new Promise<boolean>((resolve) => {
      resolveSpin = resolve

      spinTimer = setTimeout(() => {
        finishSpin(true, true)
      }, duration)
    })
  }

  return {
    isSpinning,
    startSpin,
    cancel,
    dispose,
  }
}

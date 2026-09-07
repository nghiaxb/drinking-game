import { ref, type Ref } from 'vue'
import { BOMB_CONFIG, DEFAULT_BOMB_FUSE_RANGE } from '../config'
import { tickIntervalAt } from '../logic/bombGame'

export interface BombFuseOptions {
  playTick: () => Promise<void>
  onExplode: () => void
}

export interface BombFuseController {
  isBurning: Ref<boolean>
  /** Current tick pace, exposed so the visible pulse matches what the table can hear. */
  tickIntervalMs: Ref<number>
  start: (fuseMs: number, rampMs: number) => void
  stop: () => void
  dispose: () => void
}

export function useBombFuse(options: BombFuseOptions): BombFuseController {
  const isBurning = ref(false)
  const tickIntervalMs = ref<number>(BOMB_CONFIG.tickStartIntervalMs)
  let timer: ReturnType<typeof setTimeout> | null = null
  let startedAt = 0
  let deadline = 0
  // Always overwritten by start(); seeded with a real ramp so a stray schedule cannot floor it.
  let ramp = DEFAULT_BOMB_FUSE_RANGE.minMs

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function finish(): void {
    clearTimer()
    isBurning.value = false
    options.onExplode()
  }

  function schedule(): void {
    const now = Date.now()
    const remaining = deadline - now
    if (remaining <= 0) {
      finish()
      return
    }

    const interval = tickIntervalAt(now - startedAt, ramp)
    tickIntervalMs.value = interval

    /*
     * Clamped to the time left, otherwise a slow early tick would hold the blast back by up to its
     * own interval. The clamp cannot leak the fuse: the shortened wait ends with the explosion, so
     * there is no tick left to hear it in.
     */
    timer = setTimeout(
      () => {
        timer = null
        if (Date.now() >= deadline) {
          finish()
          return
        }
        void Promise.resolve(options.playTick()).catch(() => {
          // Tick sound failure — safe no-op.
        })
        schedule()
      },
      Math.min(interval, remaining),
    )
  }

  function start(fuseMs: number, rampMs: number): void {
    clearTimer()
    startedAt = Date.now()
    deadline = startedAt + fuseMs
    ramp = rampMs
    tickIntervalMs.value = BOMB_CONFIG.tickStartIntervalMs
    isBurning.value = true
    schedule()
  }

  function stop(): void {
    clearTimer()
    isBurning.value = false
  }

  return {
    isBurning,
    tickIntervalMs,
    start,
    stop,
    dispose: stop,
  }
}

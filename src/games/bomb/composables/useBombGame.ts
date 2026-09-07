import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { AppStorage } from '@/services/storage'
import { BOMB_CONFIG, BOMB_STORAGE_KEY_FUSE } from '../config'
import { BOMB_TOPICS } from '../data/bombTopics'
import {
  createBombState,
  explodeBomb,
  parsePersistedFuseRange,
  pickFuseMs,
  resetRound,
  resolveTickRampMs,
  setFuseMax,
  setFuseMin,
  setFuseRange,
  startRound,
  type RandomSource,
} from '../logic/bombGame'
import type { BombFuseRange, BombPhase, BombTopic } from '../types'
import { useBombFuse } from './useBombFuse'

export interface BombFeedback {
  playClick: () => Promise<void>
  playTick: () => Promise<void>
  playExplosion: () => Promise<void>
  vibrateHeavy: () => Promise<void>
}

export interface BombGameOptions {
  topics?: readonly BombTopic[]
  rng?: RandomSource
  storage: AppStorage
  feedback: BombFeedback
  primeAudio?: () => void
}

export interface BombGameController {
  phase: ComputedRef<BombPhase>
  currentTopic: ComputedRef<BombTopic | null>
  topicCount: ComputedRef<number>
  fuseRange: ComputedRef<BombFuseRange>
  tickIntervalMs: Ref<number>
  canReplay: ComputedRef<boolean>
  load: () => Promise<void>
  setMin: (ms: number) => void
  setMax: (ms: number) => void
  saveFuseRange: () => Promise<void>
  start: () => boolean
  dispose: () => void
}

function defaultRng(): number {
  return Math.random()
}

export function createBombGame(options: BombGameOptions): BombGameController {
  const rng = options.rng ?? defaultRng
  const state = ref(createBombState(options.topics ?? BOMB_TOPICS))
  const replayLocked = ref(false)
  let graceTimer: ReturnType<typeof setTimeout> | null = null
  let loadPromise: Promise<void> | null = null

  const fuse = useBombFuse({
    playTick: () => options.feedback.playTick(),
    onExplode: () => {
      state.value = explodeBomb(state.value)

      void Promise.resolve(options.feedback.playExplosion()).catch(() => {
        // Explosion sound failure — safe no-op.
      })
      void Promise.resolve(options.feedback.vibrateHeavy()).catch(() => {
        // Haptic failure — safe no-op.
      })

      replayLocked.value = true
      graceTimer = setTimeout(() => {
        graceTimer = null
        replayLocked.value = false
      }, BOMB_CONFIG.replayGraceMs)
    },
  })

  function clearGraceTimer(): void {
    if (graceTimer !== null) {
      clearTimeout(graceTimer)
      graceTimer = null
    }
  }

  async function load(): Promise<void> {
    if (loadPromise) {
      return loadPromise
    }

    loadPromise = (async () => {
      const stored = await options.storage.get<unknown>(BOMB_STORAGE_KEY_FUSE, null)
      state.value = setFuseRange(state.value, parsePersistedFuseRange(stored))
    })()

    return loadPromise
  }

  /*
   * Split from setMin/setMax on purpose: a slider fires on every step of a drag, and writing to
   * storage that often would hammer the native Preferences bridge. The view saves on release.
   */
  async function saveFuseRange(): Promise<void> {
    await options.storage.set(BOMB_STORAGE_KEY_FUSE, { ...state.value.fuseRange })
  }

  function setMin(ms: number): void {
    state.value = setFuseRange(state.value, setFuseMin(state.value.fuseRange, ms))
  }

  function setMax(ms: number): void {
    state.value = setFuseRange(state.value, setFuseMax(state.value.fuseRange, ms))
  }

  function start(): boolean {
    if (state.value.phase === 'running' || replayLocked.value) {
      return false
    }

    options.primeAudio?.()

    const next = startRound(resetRound(state.value), rng)
    if (next.phase !== 'running') {
      return false
    }

    state.value = next

    void Promise.resolve(options.feedback.playClick()).catch(() => {
      // Click sound failure — safe no-op.
    })

    const range = state.value.fuseRange
    fuse.start(pickFuseMs(rng, range), resolveTickRampMs(range))
    return true
  }

  function dispose(): void {
    fuse.dispose()
    clearGraceTimer()
    replayLocked.value = false
  }

  return {
    phase: computed(() => state.value.phase),
    currentTopic: computed(() => state.value.currentTopic),
    topicCount: computed(() => state.value.pool.length),
    fuseRange: computed(() => state.value.fuseRange),
    tickIntervalMs: fuse.tickIntervalMs,
    canReplay: computed(() => state.value.phase === 'exploded' && !replayLocked.value),
    load,
    setMin,
    setMax,
    saveFuseRange,
    start,
    dispose,
  }
}

export function useBombGame(options: BombGameOptions): BombGameController {
  return createBombGame(options)
}

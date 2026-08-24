import { computed, ref, type ComputedRef, type Ref } from 'vue'
import {
  resolveBaseSpinMs,
  resolveCycleIntervalMs,
  resolveReelStopDelayMs,
} from '../config'
import { computeSpinPlan, createInitialState, type RandomSource } from '../logic/slotGame'
import type { SlotGameState, SlotSymbolId, SpinPlan } from '../types'
import { useSlotAnimation } from './useSlotAnimation'

export interface SlotFeedback {
  playSpin: () => Promise<void>
  playWin: () => Promise<void>
  playLose: () => Promise<void>
  vibrateLight: () => Promise<void>
  vibrateHeavy: () => Promise<void>
}

export interface SlotGameOptions {
  rng?: RandomSource
  feedback: SlotFeedback
  prefersReducedMotion: Ref<boolean>
  primeAudio?: () => void
}

export interface SlotGameController {
  phase: ComputedRef<SlotGameState['phase']>
  symbols: ComputedRef<[SlotSymbolId, SlotSymbolId, SlotSymbolId] | null>
  displaySymbols: Ref<[SlotSymbolId, SlotSymbolId, SlotSymbolId]>
  stoppedReels: Ref<[boolean, boolean, boolean]>
  outcome: ComputedRef<SlotGameState['outcome']>
  rewardLabel: ComputedRef<string | null>
  isJackpot: ComputedRef<boolean>
  pendingPlan: Ref<SpinPlan | null>
  isSpinning: Ref<boolean>
  spin: () => Promise<boolean>
  dismissResult: () => void
  dispose: () => void
}

function defaultRng(): number {
  return Math.random()
}

export function createSlotGame(options: SlotGameOptions): SlotGameController {
  const rng = options.rng ?? defaultRng
  const state = ref(createInitialState())
  const pendingPlan = ref<SpinPlan | null>(null)
  let spinInProgress = false

  const animation = useSlotAnimation({
    resolveTimings: () => ({
      baseSpinMs: resolveBaseSpinMs(options.prefersReducedMotion.value),
      reelStopDelayMs: resolveReelStopDelayMs(options.prefersReducedMotion.value),
      cycleIntervalMs: resolveCycleIntervalMs(options.prefersReducedMotion.value),
    }),
    onReelStop: () => {
      void Promise.resolve(options.feedback.vibrateLight()).catch(() => {
        // Haptic failure — safe no-op.
      })
    },
    onComplete: () => {
      const plan = pendingPlan.value
      if (!plan) {
        return
      }

      state.value = {
        phase: 'result',
        symbols: plan.symbols,
        outcome: plan.outcome,
        rewardLabel: plan.rewardLabel,
        isJackpot: plan.isJackpot,
      }
      pendingPlan.value = null

      if (plan.isJackpot) {
        void Promise.resolve(options.feedback.playWin()).catch(() => {
          // Win sound failure — safe no-op.
        })
        void Promise.resolve(options.feedback.vibrateHeavy()).catch(() => {
          // Haptic failure — safe no-op.
        })
        return
      }

      void Promise.resolve(options.feedback.playLose()).catch(() => {
        // Lose sound failure — safe no-op.
      })
    },
  })

  async function spin(): Promise<boolean> {
    if (state.value.phase === 'spinning' || spinInProgress || animation.isAnimating.value) {
      return false
    }

    spinInProgress = true
    options.primeAudio?.()

    const plan = computeSpinPlan(rng)
    pendingPlan.value = plan
    state.value = {
      phase: 'spinning',
      symbols: null,
      outcome: null,
      rewardLabel: null,
      isJackpot: false,
    }

    void Promise.resolve(options.feedback.playSpin()).catch(() => {
      // Spin sound failure — safe no-op.
    })

    const completed = await animation.startSpin(plan.symbols)
    spinInProgress = false

    if (!completed) {
      pendingPlan.value = null
      state.value = createInitialState()
      return false
    }

    return true
  }

  function dismissResult(): void {
    state.value = createInitialState()
  }

  function dispose(): void {
    animation.dispose()
    pendingPlan.value = null
    spinInProgress = false
    if (state.value.phase === 'spinning') {
      state.value = createInitialState()
    }
  }

  return {
    phase: computed(() => state.value.phase),
    symbols: computed(() => state.value.symbols),
    displaySymbols: animation.displaySymbols,
    stoppedReels: animation.stoppedReels,
    outcome: computed(() => state.value.outcome),
    rewardLabel: computed(() => state.value.rewardLabel),
    isJackpot: computed(() => state.value.isJackpot),
    pendingPlan,
    isSpinning: animation.isAnimating,
    spin,
    dismissResult,
    dispose,
  }
}

export function useSlotGame(options: SlotGameOptions): SlotGameController {
  return createSlotGame(options)
}

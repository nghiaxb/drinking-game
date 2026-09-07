import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { CheatArmSource } from '@/cheat/cheatArm'
import { CROCODILE_CONFIG } from '../config'
import {
  createInitialState,
  isTerminal as checkTerminal,
  isToothDisabled as checkToothDisabled,
  pressTooth,
  resetGame,
  type RandomSource,
} from '../logic/crocodileGame'
import type { CrocodileGameState, CrocodilePhase } from '../types'

export interface CrocodileFeedback {
  playClick: () => Promise<void>
  playChomp: () => Promise<void>
  vibrateLight: () => Promise<void>
  vibrateHeavy: () => Promise<void>
}

export interface CrocodileGameOptions {
  rng?: RandomSource
  feedback: CrocodileFeedback
  primeAudio?: () => void
  cheat?: CheatArmSource
}

export interface CrocodileGameController {
  phase: Ref<CrocodilePhase>
  pressedIndices: Ref<readonly number[]>
  trapIndex: Ref<number>
  toothCount: Ref<number>
  upperRowCount: Ref<number>
  lowerRowCount: Ref<number>
  isTerminal: ComputedRef<boolean>
  jawClosed: ComputedRef<boolean>
  isToothDisabled: (index: number) => boolean
  pressTooth: (index: number) => Promise<void>
  reset: () => void
  primeAudio: () => void
}

function defaultRng(): number {
  return Math.random()
}

export function createCrocodileGame(options: CrocodileGameOptions): CrocodileGameController {
  const rng = options.rng ?? defaultRng
  const state = ref<CrocodileGameState>(createInitialState(rng))
  let pressChain: Promise<void> = Promise.resolve()

  const phase = computed(() => state.value.phase)
  const pressedIndices = computed(() => state.value.pressedIndices)
  const trapIndex = computed(() => state.value.trapIndex)
  const toothCount = computed(() => state.value.toothCount)
  const isTerminal = computed(() => checkTerminal(state.value))
  const jawClosed = computed(() => state.value.phase === 'bitten')

  function isToothDisabled(index: number): boolean {
    return checkToothDisabled(state.value, index)
  }

  async function deliverFeedback(outcome: 'safe' | 'trap'): Promise<void> {
    if (outcome === 'safe') {
      await options.feedback.playClick()
      await options.feedback.vibrateLight()
      return
    }

    await options.feedback.playChomp()
    await options.feedback.vibrateHeavy()
  }

  function handlePress(index: number): Promise<void> {
    const forced = options.cheat?.takeForcedOutcome('crocodile')
    const result = pressTooth(state.value, index, forced, rng)
    const outcome = result.outcome
    options.cheat?.settle(outcome !== 'ignored')

    if (outcome === 'ignored') {
      return pressChain
    }

    state.value = result.state
    // Only feedback is serialised: state must land on the same tick as the press.
    pressChain = pressChain.then(() => deliverFeedback(outcome)).catch(() => {})
    return pressChain
  }

  function reset(): void {
    state.value = resetGame(rng)
  }

  function primeAudio(): void {
    options.primeAudio?.()
  }

  return {
    phase,
    pressedIndices,
    trapIndex,
    toothCount,
    upperRowCount: computed(() => CROCODILE_CONFIG.upperRowCount),
    lowerRowCount: computed(() => CROCODILE_CONFIG.lowerRowCount),
    isTerminal,
    jawClosed,
    isToothDisabled,
    pressTooth: handlePress,
    reset,
    primeAudio,
  }
}

export function useCrocodileGame(options: CrocodileGameOptions): CrocodileGameController {
  return createCrocodileGame(options)
}

import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { MINE_CONFIG } from '../config'
import {
  createInitialState,
  isCellDisabled as checkCellDisabled,
  isTerminal as checkTerminal,
  pressCell,
  resetGame,
  type RandomSource,
} from '../logic/mineGame'
import type { MineGameState, MinePhase } from '../types'

export interface MineFeedback {
  playClick: () => Promise<void>
  playExplosion: () => Promise<void>
  vibrateLight: () => Promise<void>
  vibrateHeavy: () => Promise<void>
}

export interface MineGameOptions {
  rng?: RandomSource
  feedback: MineFeedback
  primeAudio?: () => void
}

export interface MineGameController {
  phase: Ref<MinePhase>
  revealedIndices: Ref<readonly number[]>
  mineIndices: Ref<readonly number[]>
  hitMineIndex: Ref<number | null>
  gridSize: Ref<number>
  mineCount: Ref<number>
  isTerminal: ComputedRef<boolean>
  isCellDisabled: (index: number) => boolean
  pressCell: (index: number) => Promise<void>
  reset: () => void
  primeAudio: () => void
}

function defaultRng(): number {
  return Math.random()
}

export function createMineGame(options: MineGameOptions): MineGameController {
  const rng = options.rng ?? defaultRng
  const state = ref<MineGameState>(createInitialState(rng))
  let pressChain: Promise<void> = Promise.resolve()

  const phase = computed(() => state.value.phase)
  const revealedIndices = computed(() => state.value.revealedIndices)
  const mineIndices = computed(() => state.value.mineIndices)
  const hitMineIndex = computed(() => state.value.hitMineIndex)
  const gridSize = computed(() => state.value.gridSize)
  const mineCount = computed(() => state.value.mineCount)
  const isTerminal = computed(() => checkTerminal(state.value))

  function isCellDisabled(index: number): boolean {
    return checkCellDisabled(state.value, index)
  }

  async function deliverFeedback(outcome: 'safe' | 'mine'): Promise<void> {
    if (outcome === 'safe') {
      await options.feedback.playClick()
      await options.feedback.vibrateLight()
      return
    }

    await options.feedback.playExplosion()
    await options.feedback.vibrateHeavy()
  }

  function handlePress(index: number): Promise<void> {
    pressChain = pressChain
      .then(async () => {
        const result = pressCell(state.value, index)
        if (result.outcome === 'ignored') {
          return
        }

        state.value = result.state
        await deliverFeedback(result.outcome)
      })
      .catch(() => {
        // Feedback failures are no-ops; keep chain alive for later presses.
      })

    return pressChain
  }

  function reset(): void {
    state.value = resetGame(rng, MINE_CONFIG.gridSize, MINE_CONFIG.mineCount)
  }

  function primeAudio(): void {
    options.primeAudio?.()
  }

  return {
    phase,
    revealedIndices,
    mineIndices,
    hitMineIndex,
    gridSize,
    mineCount,
    isTerminal,
    isCellDisabled,
    pressCell: handlePress,
    reset,
    primeAudio,
  }
}

export function useMineGame(options: MineGameOptions): MineGameController {
  return createMineGame(options)
}

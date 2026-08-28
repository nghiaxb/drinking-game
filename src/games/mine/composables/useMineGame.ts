import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { MINE_CONFIG } from '../config'
import {
  clampMineCount,
  computeNextRisk,
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
  safeRevealedCount: ComputedRef<number>
  safeTotalCount: ComputedRef<number>
  nextRisk: ComputedRef<number>
  isTerminal: ComputedRef<boolean>
  isCellDisabled: (index: number) => boolean
  pressCell: (index: number) => Promise<void>
  setMineCount: (count: number) => void
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
  // Kept outside the round so replaying kicks off a new board at the count the player picked.
  const chosenMineCount = ref(clampMineCount(MINE_CONFIG.mineCount, MINE_CONFIG.gridSize))

  const phase = computed(() => state.value.phase)
  const revealedIndices = computed(() => state.value.revealedIndices)
  const mineIndices = computed(() => state.value.mineIndices)
  const hitMineIndex = computed(() => state.value.hitMineIndex)
  const gridSize = computed(() => state.value.gridSize)
  const mineCount = computed(() => state.value.mineCount)
  const isTerminal = computed(() => checkTerminal(state.value))
  const safeTotalCount = computed(
    () => state.value.gridSize * state.value.gridSize - state.value.mineCount,
  )
  const safeRevealedCount = computed(() => {
    const mines = new Set(state.value.mineIndices)
    return state.value.revealedIndices.filter((index) => !mines.has(index)).length
  })
  const nextRisk = computed(() => computeNextRisk(state.value))

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
    // Reveal synchronously. This used to run inside the feedback chain, which meant every tap
    // waited for the previous tap's sound and vibration to resolve — eight quick taps took over
    // half a second to show up, and taps with several fingers were serialised behind each other.
    const result = pressCell(state.value, index)
    const outcome = result.outcome
    if (outcome === 'ignored') {
      return pressChain
    }

    state.value = result.state

    // Sound and haptics still queue, so two cells never overlap their click, but nothing waits
    // on them to draw.
    pressChain = pressChain
      .then(() => deliverFeedback(outcome))
      .catch(() => {
        // Feedback failures are no-ops; keep the chain alive for later presses.
      })

    return pressChain
  }

  function reset(): void {
    state.value = resetGame(rng, MINE_CONFIG.gridSize, chosenMineCount.value)
  }

  function setMineCount(count: number): void {
    const next = clampMineCount(count, MINE_CONFIG.gridSize)
    if (next === chosenMineCount.value) {
      return
    }
    chosenMineCount.value = next
    reset()
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
    safeRevealedCount,
    safeTotalCount,
    nextRisk,
    isTerminal,
    isCellDisabled,
    pressCell: handlePress,
    setMineCount,
    reset,
    primeAudio,
  }
}

export function useMineGame(options: MineGameOptions): MineGameController {
  return createMineGame(options)
}

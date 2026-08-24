import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { resolveFlipDurationMs } from '../config'
import { ALL_CARDS } from '../data'
import {
  cloneEngineState,
  createEngineState,
  drawCard,
  filterCards,
  manualReshuffle,
  remainingCount,
  setDeckType,
  setTruthDifficulties,
  toggleTruthDifficulty,
  type RandomSource,
} from '../logic/cardsEngine'
import type { Card, DeckType, TruthDifficulty } from '../types'
import { useCardsAnimation } from './useCardsAnimation'

export interface CardsFeedback {
  playClick: () => Promise<void>
  vibrateLight: () => Promise<void>
}

export interface CardsGameOptions {
  allCards?: readonly Card[]
  rng?: RandomSource
  feedback: CardsFeedback
  prefersReducedMotion: Ref<boolean>
  primeAudio?: () => void
}

export interface CardsGameController {
  deckType: Ref<DeckType>
  truthDifficulties: Ref<TruthDifficulty[]>
  currentCard: Ref<Card | null>
  remaining: ComputedRef<number>
  totalInPool: ComputedRef<number>
  cycleNumber: ComputedRef<number>
  isAnimating: Ref<boolean>
  isFlipped: Ref<boolean>
  isRevealed: Ref<boolean>
  draw: () => Promise<boolean>
  reshuffle: () => void
  setDeck: (deckType: DeckType) => void
  toggleDifficulty: (difficulty: TruthDifficulty) => void
  dispose: () => void
}

function defaultRng(): number {
  return Math.random()
}

export function createCardsGame(options: CardsGameOptions): CardsGameController {
  const allCards = options.allCards ?? ALL_CARDS
  const rng = options.rng ?? defaultRng
  const truthDifficulties = ref<TruthDifficulty[]>(['light', 'medium', 'spicy'])
  const deckType = ref<DeckType>('truth')
  const engineState = ref(
    createEngineState({
      deckType: deckType.value,
      truthDifficulties: truthDifficulties.value,
      pool: filterCards(allCards, deckType.value, truthDifficulties.value),
      rng,
    }),
  )

  let drawInProgress = false

  const animation = useCardsAnimation({
    resolveDurationMs: () => resolveFlipDurationMs(options.prefersReducedMotion.value),
  })

  const currentCard = computed(() => engineState.value.currentCard)
  const remaining = computed(() => remainingCount(engineState.value))
  const totalInPool = computed(() => engineState.value.pool.length)
  const cycleNumber = computed(() => engineState.value.cycleNumber)

  async function draw(): Promise<boolean> {
    if (drawInProgress || animation.isAnimating.value) {
      return false
    }

    drawInProgress = true
    options.primeAudio?.()

    const snapshot = cloneEngineState(engineState.value)
    const result = drawCard(engineState.value, rng)
    if (!result.card) {
      drawInProgress = false
      return false
    }

    engineState.value = result.state
    animation.resetToBack()

    void Promise.resolve(options.feedback.playClick()).catch(() => {
      // Click sound failure — safe no-op.
    })
    void Promise.resolve(options.feedback.vibrateLight()).catch(() => {
      // Haptic failure — safe no-op.
    })

    const completed = await animation.startFlip()
    drawInProgress = false

    if (!completed) {
      engineState.value = snapshot
      return false
    }

    return true
  }

  function reshuffle(): void {
    if (animation.isAnimating.value) {
      return
    }
    animation.resetToBack()
    engineState.value = manualReshuffle(engineState.value, rng)
  }

  function setDeck(nextDeck: DeckType): void {
    if (animation.isAnimating.value) {
      return
    }
    deckType.value = nextDeck
    engineState.value =
      nextDeck === 'truth'
        ? setTruthDifficulties(engineState.value, truthDifficulties.value, rng, allCards)
        : setDeckType(engineState.value, nextDeck, rng, allCards)
    animation.resetToBack()
  }

  function toggleDifficulty(difficulty: TruthDifficulty): void {
    if (animation.isAnimating.value || deckType.value !== 'truth') {
      return
    }
    truthDifficulties.value = toggleTruthDifficulty(truthDifficulties.value, difficulty)
    engineState.value = setTruthDifficulties(
      engineState.value,
      truthDifficulties.value,
      rng,
      allCards,
    )
    animation.resetToBack()
  }

  function dispose(): void {
    animation.dispose()
    drawInProgress = false
  }

  return {
    deckType,
    truthDifficulties,
    currentCard,
    remaining,
    totalInPool,
    cycleNumber,
    isAnimating: animation.isAnimating,
    isFlipped: animation.isFlipped,
    isRevealed: animation.isRevealed,
    draw,
    reshuffle,
    setDeck,
    toggleDifficulty,
    dispose,
  }
}

export function useCardsGame(options: CardsGameOptions): CardsGameController {
  return createCardsGame(options)
}

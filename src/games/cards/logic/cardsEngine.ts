import { CARDS_CONFIG } from '../config'
import type { Card, CardsEngineState, DeckType, TruthDifficulty } from '../types'

export type RandomSource = () => number

export function normalizeRngValue(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0
  }
  if (raw <= 0) {
    return 0
  }
  if (raw >= 1) {
    return 0.9999999999999999
  }
  return raw
}

export function shuffleInPlace<T>(items: T[], rng: RandomSource): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizeRngValue(rng()) * (index + 1))
    const current = items[index]
    items[index] = items[swapIndex]!
    items[swapIndex] = current!
  }
  return items
}

export function buildShuffledBag(
  cards: readonly Card[],
  recentIds: readonly string[],
  rng: RandomSource,
): Card[] {
  if (cards.length <= CARDS_CONFIG.recentAvoidanceCount || recentIds.length === 0) {
    return shuffleInPlace([...cards], rng)
  }

  const recentSet = new Set(recentIds.slice(-CARDS_CONFIG.recentAvoidanceCount))
  const nonRecent = cards.filter((card) => !recentSet.has(card.id))
  const recent = cards.filter((card) => recentSet.has(card.id))

  if (nonRecent.length === 0) {
    return shuffleInPlace([...cards], rng)
  }

  return [...shuffleInPlace([...nonRecent], rng), ...shuffleInPlace([...recent], rng)]
}

export function filterCards(
  allCards: readonly Card[],
  deckType: DeckType,
  truthDifficulties: readonly TruthDifficulty[],
): Card[] {
  if (deckType === 'truth') {
    const selected = new Set(truthDifficulties)
    return allCards.filter(
      (card): card is Extract<Card, { deck: 'truth' }> =>
        card.deck === 'truth' && selected.has(card.difficulty),
    )
  }

  if (deckType === 'dare') {
    return allCards.filter((card): card is Extract<Card, { deck: 'dare' }> => card.deck === 'dare')
  }

  return allCards.filter(
    (card): card is Extract<Card, { deck: 'drinking' }> => card.deck === 'drinking',
  )
}

export function toggleTruthDifficulty(
  selected: readonly TruthDifficulty[],
  difficulty: TruthDifficulty,
): TruthDifficulty[] {
  if (selected.includes(difficulty)) {
    if (selected.length <= 1) {
      return [...selected]
    }
    return selected.filter((entry) => entry !== difficulty)
  }
  return [...selected, difficulty]
}

export function appendRecentId(recentIds: readonly string[], cardId: string): string[] {
  return [...recentIds, cardId].slice(-CARDS_CONFIG.recentAvoidanceCount)
}

export interface CreateEngineStateInput {
  deckType: DeckType
  truthDifficulties: TruthDifficulty[]
  pool: Card[]
  rng: RandomSource
  recentIds?: string[]
  cycleNumber?: number
}

export function createEngineState(input: CreateEngineStateInput): CardsEngineState {
  const recentIds = input.recentIds ?? []
  const cycleNumber = input.cycleNumber ?? 1
  const bag = buildShuffledBag(input.pool, recentIds, input.rng)

  return {
    deckType: input.deckType,
    truthDifficulties: [...input.truthDifficulties],
    pool: [...input.pool],
    bag,
    currentCard: null,
    drawnThisCycle: 0,
    cycleNumber,
    recentIds: [...recentIds],
  }
}

export interface DrawCardResult {
  state: CardsEngineState
  card: Card | null
}

export function drawCard(state: CardsEngineState, rng: RandomSource): DrawCardResult {
  let nextState: CardsEngineState = {
    ...state,
    bag: [...state.bag],
    recentIds: [...state.recentIds],
  }

  if (nextState.bag.length === 0) {
    nextState = {
      ...nextState,
      cycleNumber: nextState.cycleNumber + 1,
      drawnThisCycle: 0,
      bag: buildShuffledBag(nextState.pool, nextState.recentIds, rng),
    }
  }

  if (nextState.bag.length === 0) {
    return { state: nextState, card: null }
  }

  const card = nextState.bag[0] ?? null
  if (!card) {
    return { state: nextState, card: null }
  }

  nextState.bag = nextState.bag.slice(1)
  nextState.currentCard = card
  nextState.drawnThisCycle += 1
  nextState.recentIds = appendRecentId(nextState.recentIds, card.id)

  return { state: nextState, card }
}

export function manualReshuffle(state: CardsEngineState, rng: RandomSource): CardsEngineState {
  return {
    ...state,
    cycleNumber: state.cycleNumber + 1,
    bag: buildShuffledBag(state.pool, state.recentIds, rng),
    currentCard: null,
    drawnThisCycle: 0,
  }
}

export function setDeckType(
  state: CardsEngineState,
  deckType: DeckType,
  rng: RandomSource,
  allCards: readonly Card[],
): CardsEngineState {
  const pool = filterCards(allCards, deckType, state.truthDifficulties)
  return createEngineState({
    deckType,
    truthDifficulties: state.truthDifficulties,
    pool,
    rng,
  })
}

export function setTruthDifficulties(
  _state: CardsEngineState,
  truthDifficulties: TruthDifficulty[],
  rng: RandomSource,
  allCards: readonly Card[],
): CardsEngineState {
  const pool = filterCards(allCards, 'truth', truthDifficulties)
  return createEngineState({
    deckType: 'truth',
    truthDifficulties,
    pool,
    rng,
  })
}

export function remainingCount(state: CardsEngineState): number {
  return state.bag.length
}

export function cloneEngineState(state: CardsEngineState): CardsEngineState {
  return {
    ...state,
    truthDifficulties: [...state.truthDifficulties],
    pool: [...state.pool],
    bag: [...state.bag],
    recentIds: [...state.recentIds],
    currentCard: state.currentCard ? { ...state.currentCard } : null,
  }
}

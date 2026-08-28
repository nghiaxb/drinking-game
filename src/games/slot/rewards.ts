import { DICE_CHALLENGES, MISS_ACTIONS } from './challengeConfig'
import { normalizeRngValue, pickWeightedSymbol } from './probabilities'
import type { ResolvedReward, SlotSymbolId, SpinOutcome, SymbolWeights } from './types'

/*
 * One unit across the whole app — percent of the glass, the same wording the wheel uses. The table
 * used to mix "3 ngụm" and "100%" in adjacent entries, so nobody could tell which was heavier.
 * Three steps (25 / 50 / 100) keep the pair tier readably lighter than the jackpot above it.
 */
export const TRIPLE_REWARD_LABELS: Record<Exclude<SlotSymbolId, 'dice'>, string> = {
  beer: 'Uống 50%',
  skull: 'Uống 100%',
  clover: 'Miễn uống',
  crown: 'Chỉ định 2 người',
  fire: 'Đồng khởi',
}

/**
 * A pair is the same effect as its triple, one notch down. Only triples were ever rewarded before,
 * which left 97% of pulls doing nothing at all — and a pull that does nothing is a wasted turn.
 */
export const PAIR_REWARD_LABELS: Record<SlotSymbolId, string> = {
  beer: 'Uống 25%',
  skull: 'Uống 50%',
  clover: 'Miễn lượt này',
  crown: 'Chỉ định 1 người uống 50%',
  fire: 'Cả bàn uống 25%',
  dice: 'Oẳn tù tì với người bên phải — thua uống 50%',
}

export const JACKPOT_HEADLINE = 'JACKPOT!'
export const PAIR_HEADLINE = 'ĂN ĐÔI!'
export const MISS_HEADLINE = 'Ba ô khác nhau'

export function isTriple(symbols: readonly SlotSymbolId[]): boolean {
  if (symbols.length !== 3) {
    return false
  }
  return symbols[0] === symbols[1] && symbols[1] === symbols[2]
}

/** The symbol that appears twice, or null when all three differ. */
export function findPairSymbol(symbols: readonly SlotSymbolId[]): SlotSymbolId | null {
  if (symbols.length !== 3 || isTriple(symbols)) {
    return null
  }

  const [first, second, third] = symbols
  if (first === second || first === third) {
    return first ?? null
  }
  if (second === third) {
    return second ?? null
  }
  return null
}

/** Shared picker for the dice and miss decks, so both survive a non-finite rng value. */
function pickFromDeck(deck: readonly string[], raw: number, fallback: string): string {
  if (deck.length === 0) {
    return fallback
  }

  if (!Number.isFinite(raw)) {
    return raw === Number.POSITIVE_INFINITY
      ? (deck[deck.length - 1] ?? fallback)
      : (deck[0] ?? fallback)
  }

  const normalized = normalizeRngValue(raw)
  const index = Math.min(deck.length - 1, Math.floor(normalized * deck.length))
  return deck[index] ?? deck[0] ?? fallback
}

export function pickDiceChallenge(challenges: readonly string[], raw: number): string {
  return pickFromDeck(challenges, raw, 'Thử thách ngẫu nhiên')
}

export function pickMissAction(actions: readonly string[], raw: number): string {
  return pickFromDeck(actions, raw, MISS_ACTIONS[0])
}

export function resolveReward(
  symbols: readonly SlotSymbolId[],
  rngValue: number,
  challenges: readonly string[] = DICE_CHALLENGES,
  missActions: readonly string[] = MISS_ACTIONS,
): ResolvedReward {
  // A malformed row is not a turn: stay inert rather than handing out an instruction.
  if (symbols.length !== 3) {
    return { outcome: 'miss', rewardLabel: '', isJackpot: false }
  }

  if (isTriple(symbols)) {
    const symbolId = symbols[0]!

    if (symbolId === 'dice') {
      return {
        outcome: 'jackpot',
        rewardLabel: pickDiceChallenge(challenges, rngValue),
        isJackpot: true,
      }
    }

    const tripleReward = TRIPLE_REWARD_LABELS[symbolId]
    if (tripleReward) {
      return { outcome: 'jackpot', rewardLabel: tripleReward, isJackpot: true }
    }
  }

  const pairSymbol = findPairSymbol(symbols)
  const pairReward = pairSymbol ? PAIR_REWARD_LABELS[pairSymbol] : undefined
  if (pairReward) {
    return { outcome: 'pair', rewardLabel: pairReward, isJackpot: false }
  }

  // Covers three different symbols and any symbol id without a reward mapping.
  return {
    outcome: 'miss',
    rewardLabel: pickMissAction(missActions, rngValue),
    isJackpot: false,
  }
}

export function resolveOutcomeLabel(outcome: SpinOutcome, isJackpot: boolean): string {
  if (isJackpot || outcome === 'jackpot') {
    return JACKPOT_HEADLINE
  }
  return outcome === 'pair' ? PAIR_HEADLINE : MISS_HEADLINE
}

export function buildResultAnnouncement(
  outcome: SpinOutcome,
  isJackpot: boolean,
  rewardLabel: string,
  symbolRow = '',
): string {
  const parts = [resolveOutcomeLabel(outcome, isJackpot)]

  for (const part of [rewardLabel, symbolRow]) {
    const trimmed = part.trim()
    if (trimmed.length > 0) {
      parts.push(trimmed)
    }
  }

  return parts.join(' — ')
}

export type RandomSource = () => number

export function pickReelSymbols(
  rng: RandomSource,
  weights: SymbolWeights,
): [SlotSymbolId, SlotSymbolId, SlotSymbolId] {
  return [
    pickWeightedSymbol(weights, rng()),
    pickWeightedSymbol(weights, rng()),
    pickWeightedSymbol(weights, rng()),
  ]
}

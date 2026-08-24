import { DICE_CHALLENGES } from './challengeConfig'
import { normalizeRngValue, pickWeightedSymbol } from './probabilities'
import { formatSymbolRow } from './symbols'
import type { ResolvedReward, SlotSymbolId, SpinOutcome, SymbolWeights } from './types'

export const TRIPLE_REWARD_LABELS: Record<Exclude<SlotSymbolId, 'dice'>, string> = {
  beer: 'Uống 3 ngụm',
  skull: 'Uống 100%',
  clover: 'Miễn uống',
  crown: 'Chỉ định 2 người',
  fire: 'Đồng khởi',
}

export const NON_TRIPLE_HEADLINE = 'Không trúng jackpot'

export function isTriple(symbols: readonly SlotSymbolId[]): boolean {
  if (symbols.length !== 3) {
    return false
  }
  return symbols[0] === symbols[1] && symbols[1] === symbols[2]
}

export function pickDiceChallenge(
  challenges: readonly string[],
  raw: number,
): string {
  if (challenges.length === 0) {
    return 'Thử thách ngẫu nhiên'
  }

  if (!Number.isFinite(raw)) {
    return raw === Number.POSITIVE_INFINITY
      ? challenges[challenges.length - 1] ?? 'Thử thách ngẫu nhiên'
      : challenges[0] ?? 'Thử thách ngẫu nhiên'
  }

  const normalized = normalizeRngValue(raw)
  const index = Math.min(challenges.length - 1, Math.floor(normalized * challenges.length))
  return challenges[index] ?? challenges[0] ?? 'Thử thách ngẫu nhiên'
}

export function buildNonTripleLabel(symbols: readonly SlotSymbolId[]): string {
  return formatSymbolRow(symbols)
}

export function buildNonTripleAnnouncement(symbolRow: string): string {
  const trimmed = symbolRow.trim()
  if (trimmed.length === 0) {
    return NON_TRIPLE_HEADLINE
  }
  return `${NON_TRIPLE_HEADLINE} — ${trimmed}`
}

export function resolveReward(
  symbols: readonly SlotSymbolId[],
  rngValue: number,
  challenges: readonly string[] = DICE_CHALLENGES,
): ResolvedReward {
  if (symbols.length !== 3) {
    return {
      outcome: 'non-triple',
      rewardLabel: '',
      isJackpot: false,
    }
  }

  if (!isTriple(symbols)) {
    return {
      outcome: 'non-triple',
      rewardLabel: buildNonTripleLabel(symbols),
      isJackpot: false,
    }
  }

  const symbolId = symbols[0]

  if (symbolId === 'dice') {
    return {
      outcome: 'jackpot',
      rewardLabel: pickDiceChallenge(challenges, rngValue),
      isJackpot: true,
    }
  }

  const reward = TRIPLE_REWARD_LABELS[symbolId]
  if (reward) {
    return {
      outcome: 'jackpot',
      rewardLabel: reward,
      isJackpot: true,
    }
  }

  return {
    outcome: 'non-triple',
    rewardLabel: formatSymbolRow([symbolId, symbolId, symbolId]),
    isJackpot: false,
  }
}

export function resolveOutcomeLabel(outcome: SpinOutcome, isJackpot: boolean): string {
  if (isJackpot || outcome === 'jackpot') {
    return 'JACKPOT!'
  }
  return NON_TRIPLE_HEADLINE
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

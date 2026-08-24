import { DICE_CHALLENGES } from '../challengeConfig'
import { DEFAULT_SYMBOL_WEIGHTS } from '../probabilities'
import { buildNonTripleAnnouncement, pickReelSymbols, resolveReward, type RandomSource } from '../rewards'
import type { ReelVisualStatus, SlotGameState, SpinPlan, SymbolWeights } from '../types'

export type { RandomSource } from '../rewards'

export function createInitialState(): SlotGameState {
  return {
    phase: 'idle',
    symbols: null,
    outcome: null,
    rewardLabel: null,
    isJackpot: false,
  }
}

export function computeSpinPlan(
  rng: RandomSource,
  weights: SymbolWeights = DEFAULT_SYMBOL_WEIGHTS,
  challenges: readonly string[] = DICE_CHALLENGES,
): SpinPlan {
  const symbols = pickReelSymbols(rng, weights)
  const reward = resolveReward(symbols, rng(), challenges)

  return {
    symbols,
    outcome: reward.outcome,
    rewardLabel: reward.rewardLabel,
    isJackpot: reward.isJackpot,
  }
}

export function resolveReelVisualStatus(
  gamePhase: SlotGameState['phase'],
  spinning: boolean,
  stopped: boolean,
): ReelVisualStatus {
  if (spinning && !stopped) {
    return 'spinning'
  }
  if (gamePhase === 'idle') {
    return 'idle'
  }
  return 'stopped'
}

export function buildReelAriaLabel(
  reelIndex: number,
  symbolEmoji: string,
  status: ReelVisualStatus,
): string {
  const position = reelIndex === 0 ? 'trái' : reelIndex === 1 ? 'giữa' : 'phải'
  const statusLabel =
    status === 'idle' ? 'sẵn sàng' : status === 'spinning' ? 'đang quay' : 'đã dừng'
  return `Guồng ${position}: ${symbolEmoji}, ${statusLabel}`
}

export function buildStatusAriaLabel(
  phase: SlotGameState['phase'],
  rewardLabel: string | null,
  isJackpot: boolean,
): string {
  if (phase === 'idle') {
    return 'Sẵn sàng kéo cần.'
  }
  if (phase === 'spinning') {
    return 'Đang quay guồng.'
  }
  if (phase === 'result') {
    if (isJackpot) {
      return rewardLabel ? `Jackpot! ${rewardLabel}` : 'Jackpot!'
    }
    return buildNonTripleAnnouncement(rewardLabel ?? '')
  }

  return 'Kết quả hiển thị.'
}

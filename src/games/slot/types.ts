export type SlotSymbolId = 'beer' | 'skull' | 'clover' | 'crown' | 'fire' | 'dice'

export type SlotPhase = 'idle' | 'spinning' | 'result'

export type ReelVisualStatus = 'idle' | 'spinning' | 'stopped'

export type SpinOutcome = 'jackpot' | 'non-triple'

export interface SlotSymbol {
  id: SlotSymbolId
  emoji: string
  label: string
}

export interface SymbolWeights {
  beer: number
  skull: number
  clover: number
  crown: number
  fire: number
  dice: number
}

export interface SpinPlan {
  symbols: [SlotSymbolId, SlotSymbolId, SlotSymbolId]
  outcome: SpinOutcome
  rewardLabel: string
  isJackpot: boolean
}

export interface SlotGameState {
  phase: SlotPhase
  symbols: [SlotSymbolId, SlotSymbolId, SlotSymbolId] | null
  outcome: SpinOutcome | null
  rewardLabel: string | null
  isJackpot: boolean
}

export interface ResolvedReward {
  outcome: SpinOutcome
  rewardLabel: string
  isJackpot: boolean
}

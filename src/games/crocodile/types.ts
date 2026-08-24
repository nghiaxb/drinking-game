export type CrocodilePhase = 'playing' | 'bitten'

export type PressOutcome = 'safe' | 'trap' | 'ignored'

export interface CrocodileGameState {
  phase: CrocodilePhase
  toothCount: number
  trapIndex: number
  pressedIndices: readonly number[]
}

export interface PressToothResult {
  state: CrocodileGameState
  outcome: PressOutcome
}

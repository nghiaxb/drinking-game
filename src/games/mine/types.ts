export type MinePhase = 'playing' | 'exploded'

export type PressOutcome = 'safe' | 'mine' | 'ignored'

export interface MineGameState {
  phase: MinePhase
  gridSize: number
  mineCount: number
  mineIndices: readonly number[]
  revealedIndices: readonly number[]
  hitMineIndex: number | null
}

export interface PressCellResult {
  state: MineGameState
  outcome: PressOutcome
}

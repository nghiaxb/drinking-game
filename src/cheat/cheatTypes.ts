export type CheatGameId = 'crocodile' | 'mine'

export type ForcedOutcome = 'lose' | 'win'

export interface ArmedCheat {
  game: CheatGameId
  outcome: ForcedOutcome
}

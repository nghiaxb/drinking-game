export type CheatGameId = 'crocodile' | 'mine'

export type ForcedOutcome = 'lose' | 'win'

/** 'once' is spent by the next press; 'sticky' keeps firing until the admin turns it off. */
export type CheatMode = 'once' | 'sticky'

export interface ArmedCheat {
  game: CheatGameId
  outcome: ForcedOutcome
  mode: CheatMode
}

export type CheatGameId = 'crocodile' | 'mine' | 'wheel'

/** The two games where the cheat is relative to the press. */
export type PressGameId = 'crocodile' | 'mine'

export type ForcedOutcome = 'lose' | 'win'

/** 'once' is spent by the next press or spin; 'sticky' keeps firing until the admin turns it off. */
export type CheatMode = 'once' | 'sticky'

export interface WheelLabel {
  id: string
  label: string
}

/*
 * The wheel has one spin button and user-authored segments, so 'lose' means nothing there — the
 * admin picks a segment id instead. Hence a union rather than one flat shape.
 */
export type ArmedCheat =
  | { game: PressGameId; outcome: ForcedOutcome; mode: CheatMode }
  | { game: 'wheel'; itemId: string; mode: CheatMode }

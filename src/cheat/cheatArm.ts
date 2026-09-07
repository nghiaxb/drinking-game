import type { ArmedCheat, CheatGameId, ForcedOutcome } from './cheatTypes'

export interface CheatArmSource {
  /** Synchronous by contract: the press path must never await to learn the forced outcome. */
  takeForcedOutcome: (game: CheatGameId) => ForcedOutcome | undefined
  /** Called with whether the press landed; an ignored press must not burn the arm. */
  settle: (landed: boolean) => void
}

export function createCheatArmSource(
  armed: () => ArmedCheat | null,
  consume: () => void,
): CheatArmSource {
  let pending: ArmedCheat | null = null

  return {
    takeForcedOutcome(game) {
      const current = armed()
      pending = current !== null && current.game === game ? current : null
      return pending?.outcome
    },
    settle(landed) {
      if (pending && landed) {
        consume()
      }
      pending = null
    },
  }
}

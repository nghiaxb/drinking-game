import type { ArmedCheat, ForcedOutcome, PressGameId } from './cheatTypes'

export interface CheatArmSource {
  /** Synchronous by contract: the press path must never await to learn the forced outcome. */
  takeForcedOutcome: (game: PressGameId) => ForcedOutcome | undefined
  /** The wheel segment to land on, when one is armed for the wheel. */
  takeForcedItem: () => string | undefined
  /** Called with whether the press or spin landed; an ignored press must not burn the arm. */
  settle: (landed: boolean) => void
}

export function createCheatArmSource(
  armed: () => ArmedCheat | null,
  consume: () => void,
): CheatArmSource {
  let pending: ArmedCheat | null = null

  function take(matches: (current: ArmedCheat) => boolean): ArmedCheat | null {
    const current = armed()
    pending = current !== null && matches(current) ? current : null
    return pending
  }

  return {
    takeForcedOutcome(game) {
      const taken = take((current) => current.game === game)
      return taken !== null && taken.game !== 'wheel' ? taken.outcome : undefined
    },
    takeForcedItem() {
      const taken = take((current) => current.game === 'wheel')
      return taken !== null && taken.game === 'wheel' ? taken.itemId : undefined
    },
    settle(landed) {
      // Only a one-shot is spent by the press; a sticky arm keeps firing until it is turned off.
      if (pending && landed && pending.mode === 'once') {
        consume()
      }
      pending = null
    },
  }
}

import type { ArmedCheat, CheatGameId, CheatMode, ForcedOutcome } from './cheatTypes'

export type SocketRole = 'game' | 'admin'

export type CheatMessage =
  | { t: 'arm'; game: CheatGameId; outcome: ForcedOutcome; mode: CheatMode }
  | { t: 'disarm' }
  | { t: 'consumed' }
  | { t: 'state'; gameOnline: boolean; armed: ArmedCheat | null }

const GAME_IDS: readonly string[] = ['crocodile', 'mine']
const OUTCOMES: readonly string[] = ['lose', 'win']
const MODES: readonly string[] = ['once', 'sticky']

export function parseSocketRole(raw: string | null): SocketRole | null {
  return raw === 'game' || raw === 'admin' ? raw : null
}

function parseArmed(raw: unknown): ArmedCheat | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const { game, outcome } = raw as Record<string, unknown>
  if (typeof game !== 'string' || !GAME_IDS.includes(game)) {
    return null
  }
  if (typeof outcome !== 'string' || !OUTCOMES.includes(outcome)) {
    return null
  }

  /*
   * Mode is tolerated as absent, not required: a worker deployed before modes existed relays an
   * arm without it. Defaulting to 'once' degrades the trick instead of dropping the frame.
   */
  const { mode } = raw as Record<string, unknown>
  if (mode !== undefined && (typeof mode !== 'string' || !MODES.includes(mode))) {
    return null
  }

  return {
    game: game as CheatGameId,
    outcome: outcome as ForcedOutcome,
    mode: (mode as CheatMode | undefined) ?? 'once',
  }
}

/** Every socket frame is untrusted input; a bad frame is dropped, never thrown. */
export function parseCheatMessage(raw: unknown): CheatMessage | null {
  if (typeof raw !== 'string') {
    return null
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return null
  }

  const payload = decoded as Record<string, unknown>

  if (payload.t === 'disarm' || payload.t === 'consumed') {
    return { t: payload.t }
  }

  if (payload.t === 'arm') {
    const armed = parseArmed(payload)
    return armed ? { t: 'arm', ...armed } : null
  }

  if (payload.t === 'state') {
    if (typeof payload.gameOnline !== 'boolean' || !('armed' in payload)) {
      return null
    }
    if (payload.armed === null) {
      return { t: 'state', gameOnline: payload.gameOnline, armed: null }
    }
    const armed = parseArmed(payload.armed)
    return armed ? { t: 'state', gameOnline: payload.gameOnline, armed } : null
  }

  return null
}
